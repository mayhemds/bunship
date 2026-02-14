/**
 * Authentication Service
 * Core business logic for user authentication and authorization
 */
import { eq, and, gt, isNull } from "drizzle-orm";
import { getDatabase, users, sessions, verificationTokens, backupCodes } from "@bunship/database";
import { TOTP } from "otpauth";
import {
  ValidationError,
  ConflictError,
  AuthenticationError,
  NotFoundError,
  isValidPassword as validatePasswordStrength,
} from "@bunship/utils";
import { appConfig } from "@bunship/config";
import { hashPassword, verifyPassword } from "../lib/password";
import { generateToken, hashToken, hmacHash, encryptSecret, decryptSecret } from "../lib/crypto";
import { generateTokenPair } from "../lib/jwt";
import { sendEmail } from "../lib/email";

const db = getDatabase();

interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

interface LoginInput {
  email: string;
  password: string;
  twoFactorCode?: string;
  userAgent?: string;
  ipAddress?: string;
}

interface LoginResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  sessionId: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    emailVerified: Date | null;
    twoFactorEnabled: boolean;
  };
}

/**
 * Register a new user account
 */
export async function register(input: RegisterInput): Promise<{ userId: string }> {
  const { email, password, fullName } = input;

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (existingUser) {
    throw new ConflictError("Email address already in use");
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (passwordValidation !== true) {
    throw new ValidationError(passwordValidation);
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const [user] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      emailVerified: null,
      twoFactorEnabled: false,
      isActive: true,
    })
    .returning();

  if (!user) {
    throw new Error("Failed to create user");
  }

  // Generate email verification token
  const verificationToken = generateToken(32);
  const tokenHash = await hashToken(verificationToken);
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await db.insert(verificationTokens).values({
    userId: user.id,
    tokenHash,
    type: "email_verification",
    expiresAt,
  });

  // Send verification email
  await sendEmail({
    to: user.email,
    template: "verify-email",
    data: {
      name: user.fullName ?? "there",
      verificationUrl: `${appConfig.frontendUrl}/verify-email?token=${verificationToken}`,
    },
  });

  return { userId: user.id };
}

/**
 * Authenticate user and create session
 */
export async function login(input: LoginInput): Promise<LoginResult> {
  const { email, password, twoFactorCode, userAgent, ipAddress } = input;

  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  // Check if account is locked (FIX 2: account lockout)
  if (user?.lockedUntil && user.lockedUntil > new Date()) {
    throw new AuthenticationError("Account temporarily locked. Try again later.");
  }

  // FIX 3: Prevent timing attacks by always verifying a password hash,
  // even when the user does not exist. This ensures consistent response times.
  const dummyHash =
    "$argon2id$v=19$m=65536,t=3,p=1$t7dkrIIkhV6d00DFLufvsolphAxpZJgtjiRSGwuZprI$CbufnFp/YNnmPrErmuAk4ERIu5oqPyyjb1ylhsQJhQU";
  const hashToVerify = user?.passwordHash || dummyHash;
  const isPasswordValid = await verifyPassword(password, hashToVerify);

  if (!user || !user.passwordHash || !isPasswordValid) {
    // Increment failed login attempts if user exists (FIX 2)
    if (user) {
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const updates: Record<string, unknown> = { failedLoginAttempts: attempts };
      if (attempts >= 5) {
        updates.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // Lock for 15 minutes
      }
      await db.update(users).set(updates).where(eq(users.id, user.id));
    }
    throw new AuthenticationError("Invalid email or password");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AuthenticationError("Account is deactivated");
  }

  // Check 2FA if enabled
  if (user.twoFactorEnabled) {
    if (!twoFactorCode) {
      throw new AuthenticationError("Two-factor code required", {
        requiresTwoFactor: true,
      });
    }

    const decryptedSecret = await decryptSecret(user.twoFactorSecret!, process.env.JWT_SECRET!);
    const isValidCode = await verifyTOTP(decryptedSecret, twoFactorCode);
    if (!isValidCode) {
      throw new AuthenticationError("Invalid two-factor code");
    }
  }

  // Reset failed login attempts on successful login (FIX 2)
  if (user.failedLoginAttempts > 0 || user.lockedUntil) {
    await db
      .update(users)
      .set({ failedLoginAttempts: 0, lockedUntil: null })
      .where(eq(users.id, user.id));
  }

  // Create session
  const sessionId = generateToken(32);
  const refreshTokenHash = await hashToken(sessionId);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(sessions).values({
    userId: user.id,
    refreshTokenHash,
    userAgent,
    ipAddress,
    expiresAt,
  });

  // Generate JWT tokens
  const { accessToken, refreshToken } = await generateTokenPair({
    id: user.id,
    email: user.email,
    sessionId,
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
    sessionId,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      emailVerified: user.emailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
    },
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refresh(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  // Verify refresh token
  let payload;
  try {
    const { verifyRefreshToken } = await import("../lib/jwt");
    payload = await verifyRefreshToken(refreshToken);
  } catch (error) {
    throw new AuthenticationError("Invalid or expired refresh token");
  }

  // Find session
  const tokenHash = await hashToken(payload.sessionId);
  const session = await db.query.sessions.findFirst({
    where: and(eq(sessions.refreshTokenHash, tokenHash), gt(sessions.expiresAt, new Date())),
  });

  if (!session) {
    throw new AuthenticationError("Session not found or expired");
  }

  // Get user
  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  });

  if (!user || !user.isActive) {
    throw new AuthenticationError("User not found or inactive");
  }

  // Update last used timestamp
  await db.update(sessions).set({ lastUsedAt: new Date() }).where(eq(sessions.id, session.id));

  // Generate new token pair
  const newSessionId = generateToken(32);
  const newRefreshTokenHash = await hashToken(newSessionId);

  // Update session with new refresh token hash
  await db
    .update(sessions)
    .set({ refreshTokenHash: newRefreshTokenHash })
    .where(eq(sessions.id, session.id));

  const tokens = await generateTokenPair({
    id: user.id,
    email: user.email,
    sessionId: newSessionId,
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    expiresIn: 900, // 15 minutes
  };
}

/**
 * Logout user and invalidate session
 */
export async function logout(
  sessionId: string,
  userId?: string,
  allSessions = false
): Promise<void> {
  const tokenHash = await hashToken(sessionId);

  if (allSessions && userId) {
    // Delete all sessions for user
    await db.delete(sessions).where(eq(sessions.userId, userId));
  } else {
    // Delete specific session
    await db.delete(sessions).where(eq(sessions.refreshTokenHash, tokenHash));
  }
}

/**
 * Request password reset
 */
export async function forgotPassword(email: string): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  // Don't reveal if user exists for security
  if (!user) {
    return;
  }

  // Generate reset token
  const resetToken = generateToken(32);
  const tokenHash = await hashToken(resetToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Invalidate previous reset tokens
  await db
    .delete(verificationTokens)
    .where(
      and(eq(verificationTokens.userId, user.id), eq(verificationTokens.type, "password_reset"))
    );

  // Create new reset token
  await db.insert(verificationTokens).values({
    userId: user.id,
    tokenHash,
    type: "password_reset",
    expiresAt,
  });

  // Send reset email
  await sendEmail({
    to: user.email,
    template: "reset-password",
    data: {
      name: user.fullName ?? "there",
      resetUrl: `${appConfig.frontendUrl}/reset-password?token=${resetToken}`,
    },
  });
}

/**
 * Reset password with token
 */
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const tokenHash = await hashToken(token);

  // Atomically mark token as used and return it (prevents race conditions)
  const [verificationToken] = await db
    .update(verificationTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(verificationTokens.tokenHash, tokenHash),
        eq(verificationTokens.type, "password_reset"),
        gt(verificationTokens.expiresAt, new Date()),
        isNull(verificationTokens.usedAt)
      )
    )
    .returning();

  if (!verificationToken) {
    throw new ValidationError("Invalid or expired reset token");
  }

  // Validate password strength
  const passwordValidation = validatePasswordStrength(newPassword);
  if (passwordValidation !== true) {
    throw new ValidationError(passwordValidation);
  }

  // Hash new password
  const passwordHash = await hashPassword(newPassword);

  // Update user password
  await db.update(users).set({ passwordHash }).where(eq(users.id, verificationToken.userId));

  // Invalidate all sessions for security
  await db.delete(sessions).where(eq(sessions.userId, verificationToken.userId));
}

/**
 * Verify email address
 */
export async function verifyEmail(token: string): Promise<void> {
  const tokenHash = await hashToken(token);

  // Atomically mark token as used and return it (prevents race conditions)
  const [verificationToken] = await db
    .update(verificationTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(verificationTokens.tokenHash, tokenHash),
        eq(verificationTokens.type, "email_verification"),
        gt(verificationTokens.expiresAt, new Date()),
        isNull(verificationTokens.usedAt)
      )
    )
    .returning();

  if (!verificationToken) {
    throw new ValidationError("Invalid or expired verification token");
  }

  // Update user email verified status
  await db
    .update(users)
    .set({ emailVerified: new Date() })
    .where(eq(users.id, verificationToken.userId));
}

/**
 * Setup two-factor authentication
 */
export async function setupTwoFactor(
  userId: string,
  password: string
): Promise<{ secret: string; qrCode: string; backupCodes: string[] }> {
  // Verify user and password
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !user.passwordHash) {
    throw new NotFoundError("User");
  }

  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AuthenticationError("Invalid password");
  }

  if (user.twoFactorEnabled) {
    throw new ConflictError("Two-factor authentication is already enabled");
  }

  // Generate TOTP secret
  const secret = generateTOTPSecret();
  const qrCode = await generateQRCode(user.email, secret);
  const codes = generateBackupCodes();

  // Store the TOTP secret now, but keep twoFactorEnabled = false.
  // The secret is NOT active until verifyTwoFactor() sets twoFactorEnabled = true
  // after the user proves they can generate valid codes. The login flow only
  // checks TOTP when twoFactorEnabled is true, so this is safe-by-design.
  // Re-calling setupTwoFactor before verification overwrites the old secret.
  const encryptedSecret = await encryptSecret(secret, process.env.JWT_SECRET!);
  await db.update(users).set({ twoFactorSecret: encryptedSecret }).where(eq(users.id, userId));

  // Hash and store backup codes using HMAC-SHA256 (keyed hash, resistant to rainbow tables)
  await db.delete(backupCodes).where(eq(backupCodes.userId, userId)); // Remove old codes
  const hashedCodes = await Promise.all(
    codes.map(async (code) => {
      const codeHash = await hmacHash(process.env.JWT_SECRET!, code);
      return { userId, codeHash };
    })
  );
  await db.insert(backupCodes).values(hashedCodes);

  return { secret, qrCode, backupCodes: codes };
}

/**
 * Verify and enable two-factor authentication
 */
export async function verifyTwoFactor(userId: string, code: string): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !user.twoFactorSecret) {
    throw new NotFoundError("Two-factor setup not found");
  }

  if (user.twoFactorEnabled) {
    throw new ConflictError("Two-factor authentication is already enabled");
  }

  // Verify code (decrypt stored secret first)
  const decryptedSecret = await decryptSecret(user.twoFactorSecret, process.env.JWT_SECRET!);
  const isValid = await verifyTOTP(decryptedSecret, code);
  if (!isValid) {
    throw new AuthenticationError("Invalid verification code");
  }

  // Enable 2FA
  await db.update(users).set({ twoFactorEnabled: true }).where(eq(users.id, userId));
}

/**
 * Disable two-factor authentication
 */
export async function disableTwoFactor(
  userId: string,
  password: string,
  code: string
): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user || !user.passwordHash) {
    throw new NotFoundError("User");
  }

  if (!user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new ValidationError("Two-factor authentication is not enabled");
  }

  // Verify password
  const isValidPassword = await verifyPassword(password, user.passwordHash);
  if (!isValidPassword) {
    throw new AuthenticationError("Invalid password");
  }

  // Verify current code (decrypt stored secret first)
  const decryptedSecret = await decryptSecret(user.twoFactorSecret, process.env.JWT_SECRET!);
  const isValidCode = await verifyTOTP(decryptedSecret, code);
  if (!isValidCode) {
    throw new AuthenticationError("Invalid two-factor code");
  }

  // Disable 2FA
  await db
    .update(users)
    .set({
      twoFactorEnabled: false,
      twoFactorSecret: null,
    })
    .where(eq(users.id, userId));
}

/**
 * Generate TOTP secret (32 character base32 string)
 */
function generateTOTPSecret(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const buffer = new Uint8Array(20);
  crypto.getRandomValues(buffer);

  let secret = "";
  for (let i = 0; i < buffer.length; i++) {
    secret += chars[buffer[i]! % chars.length];
  }

  return secret;
}

/**
 * Generate QR code data URL for TOTP
 */
async function generateQRCode(email: string, secret: string): Promise<string> {
  const issuer = encodeURIComponent(appConfig.name);
  const accountName = encodeURIComponent(email);
  const otpauthUrl = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}`;

  // For now, return the otpauth URL - in production, use a QR code library
  // like qrcode to generate actual image data URL
  return otpauthUrl;
}

/**
 * Generate backup codes
 */
function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const buffer = new Uint8Array(4);
    crypto.getRandomValues(buffer);
    const code = Array.from(buffer)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 8)
      .toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Verify TOTP code using otpauth library
 */
async function verifyTOTP(secret: string, code: string): Promise<boolean> {
  if (!/^\d{6}$/.test(code)) return false;

  const totp = new TOTP({
    issuer: "BunShip",
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: secret,
  });

  // Allow 1 step window (30 seconds before/after)
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}
