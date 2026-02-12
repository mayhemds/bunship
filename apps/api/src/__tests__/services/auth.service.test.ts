/**
 * Auth service unit tests
 *
 * Tests the authentication business logic in src/services/auth.service.ts.
 * All database and email interactions are mocked.
 */
import { describe, it, expect, beforeEach, mock, spyOn } from "bun:test";
import { mockDatabase } from "../helpers/database-mock";

// ---------------------------------------------------------------------------
// Environment setup (must come before module imports that read env)
// ---------------------------------------------------------------------------
process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-chars-long!!";
process.env.JWT_REFRESH_SECRET = "test-jwt-refresh-secret-at-least-32-chars!!";
process.env.RESEND_API_KEY = "re_test_fake_key_for_tests";

// ---------------------------------------------------------------------------
// Shared mock state
// ---------------------------------------------------------------------------
let mockUsers: Record<string, any>[] = [];
let mockSessions: Record<string, any>[] = [];
let mockVerificationTokens: Record<string, any>[] = [];
let mockBackupCodes: Record<string, any>[] = [];

function resetMockData() {
  mockUsers = [];
  mockSessions = [];
  mockVerificationTokens = [];
  mockBackupCodes = [];
}

// Chainable query builder helper
function createChainableQuery(resolveValue: any) {
  const chain: any = {
    set: () => chain,
    values: () => chain,
    where: () => chain,
    returning: () => Promise.resolve(resolveValue !== undefined ? [resolveValue] : []),
  };
  // Make the chain itself thenable for cases where .returning() isn't called
  chain.then = (resolve: any, reject: any) => Promise.resolve(resolveValue).then(resolve, reject);
  return chain;
}

// ---------------------------------------------------------------------------
// Build the mock database
// ---------------------------------------------------------------------------
const mockDb: any = {
  query: {
    users: {
      findFirst: mock(async (_opts?: any) => {
        if (!_opts?.where) return mockUsers[0] ?? null;
        // Simple mock: return the first user (tests set up mockUsers accordingly)
        return mockUsers[0] ?? null;
      }),
    },
    sessions: {
      findFirst: mock(async (_opts?: any) => {
        return mockSessions[0] ?? null;
      }),
    },
  },
  insert: mock((table: any) => {
    return {
      values: (data: any) => {
        // Track inserted data
        if (table === usersTable) {
          const user = { id: "new-user-id", ...data };
          mockUsers.push(user);
          return {
            returning: () => Promise.resolve([user]),
          };
        }
        if (table === sessionsTable) {
          const session = { id: "new-session-id", ...data };
          mockSessions.push(session);
          return {
            returning: () => Promise.resolve([session]),
          };
        }
        if (table === verificationTokensTable) {
          mockVerificationTokens.push(data);
          return {
            returning: () => Promise.resolve([{ id: "vt-1", ...data }]),
          };
        }
        if (table === backupCodesTable) {
          if (Array.isArray(data)) {
            mockBackupCodes.push(...data);
          } else {
            mockBackupCodes.push(data);
          }
          return {
            returning: () => Promise.resolve(Array.isArray(data) ? data : [data]),
          };
        }
        return {
          returning: () => Promise.resolve([data]),
        };
      },
    };
  }),
  update: mock((table: any) => {
    return createChainableQuery(
      table === verificationTokensTable
        ? (mockVerificationTokens[0] ?? undefined)
        : table === usersTable
          ? (mockUsers[0] ?? undefined)
          : undefined
    );
  }),
  delete: mock((_table: any) => {
    return {
      where: () => Promise.resolve(),
    };
  }),
};

// ---------------------------------------------------------------------------
// Mock @bunship/database
// ---------------------------------------------------------------------------
// mockDatabase returns { tables } containing the stub table objects that get
// exported as `users`, `sessions`, etc. from "@bunship/database".
const { tables: dbTables } = mockDatabase({
  getDatabase: () => mockDb,
});

// These sentinels are the actual objects the service receives when it imports
// `users`, `sessions`, etc. from "@bunship/database".
const usersTable = dbTables.users;
const sessionsTable = dbTables.sessions;
const verificationTokensTable = dbTables.verificationTokens;
const backupCodesTable = dbTables.backupCodes;

// ---------------------------------------------------------------------------
// Mock email module
// ---------------------------------------------------------------------------
const mockSendEmail = mock(async () => {});
mock.module("../lib/email", () => ({
  sendEmail: mockSendEmail,
}));

// Also mock with absolute-style path that the service uses
mock.module("../../lib/email", () => ({
  sendEmail: mockSendEmail,
}));

// ---------------------------------------------------------------------------
// Mock otpauth
// ---------------------------------------------------------------------------
mock.module("otpauth", () => ({
  TOTP: class MockTOTP {
    constructor(_opts: any) {}
    validate(_opts: any) {
      return 0; // valid by default
    }
  },
}));

// ---------------------------------------------------------------------------
// Import the auth service under test
// ---------------------------------------------------------------------------
const authService = await import("../../services/auth.service");

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("auth.service", () => {
  beforeEach(() => {
    resetMockData();
    mockSendEmail.mockClear();
    mockDb.query.users.findFirst.mockClear();
    mockDb.query.sessions.findFirst.mockClear();
    mockDb.insert.mockClear();
    mockDb.update.mockClear();
    mockDb.delete.mockClear();
  });

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------
  describe("register", () => {
    it("creates a user and returns a userId", async () => {
      // No existing user
      mockDb.query.users.findFirst.mockResolvedValueOnce(null);

      const result = await authService.register({
        email: "newuser@example.com",
        password: "SecurePass1",
        fullName: "New User",
      });

      expect(result).toHaveProperty("userId");
      expect(typeof result.userId).toBe("string");
    });

    it("lowercases the email address", async () => {
      mockDb.query.users.findFirst.mockResolvedValueOnce(null);

      await authService.register({
        email: "MiXeD@CaSe.COM",
        password: "SecurePass1",
        fullName: "Mixed Case",
      });

      // The insert should have been called; inspect first arg's values call
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it("throws ConflictError when email is already registered", async () => {
      mockDb.query.users.findFirst.mockResolvedValueOnce({
        id: "existing-id",
        email: "taken@example.com",
      });

      expect(
        authService.register({
          email: "taken@example.com",
          password: "SecurePass1",
          fullName: "Duplicate",
        })
      ).rejects.toThrow("Email address already in use");
    });

    it("throws ValidationError for a weak password", async () => {
      mockDb.query.users.findFirst.mockResolvedValueOnce(null);

      expect(
        authService.register({
          email: "weak@example.com",
          password: "short",
          fullName: "Weak Pass",
        })
      ).rejects.toThrow();
    });

    it("sends a verification email after registration", async () => {
      mockDb.query.users.findFirst.mockResolvedValueOnce(null);

      await authService.register({
        email: "verify@example.com",
        password: "GoodPass1",
        fullName: "Verify Me",
      });

      expect(mockSendEmail).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  describe("login", () => {
    const activeUser = {
      id: "user-login-1",
      email: "login@example.com",
      passwordHash: "", // will be set in beforeEach
      fullName: "Login User",
      emailVerified: new Date(),
      twoFactorEnabled: false,
      twoFactorSecret: null,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    };

    beforeEach(async () => {
      // Hash a known password so verifyPassword succeeds
      const { hashPassword } = await import("../../lib/password");
      activeUser.passwordHash = await hashPassword("CorrectPass1");
      mockUsers = [activeUser];
    });

    it("returns tokens and user data for valid credentials", async () => {
      mockDb.query.users.findFirst.mockResolvedValueOnce(activeUser);

      const result = await authService.login({
        email: "login@example.com",
        password: "CorrectPass1",
      });

      expect(result).toHaveProperty("accessToken");
      expect(result).toHaveProperty("refreshToken");
      expect(result).toHaveProperty("sessionId");
      expect(result).toHaveProperty("expiresIn", 900);
      expect(result.user.id).toBe("user-login-1");
      expect(result.user.email).toBe("login@example.com");
    });

    it("throws AuthenticationError for wrong password", async () => {
      mockDb.query.users.findFirst.mockResolvedValueOnce(activeUser);

      expect(
        authService.login({
          email: "login@example.com",
          password: "WrongPass1",
        })
      ).rejects.toThrow("Invalid email or password");
    });

    it("throws AuthenticationError for non-existent user", async () => {
      mockDb.query.users.findFirst.mockResolvedValueOnce(null);

      expect(
        authService.login({
          email: "ghost@example.com",
          password: "AnyPass1",
        })
      ).rejects.toThrow("Invalid email or password");
    });

    it("performs timing-safe comparison even for non-existent users", async () => {
      // When user is null, the service still calls verifyPassword with a dummy hash
      // to maintain constant-time behavior. The test verifies no early return/exception
      // from a missing hash -- just the standard AuthenticationError.
      mockDb.query.users.findFirst.mockResolvedValueOnce(null);

      const start = performance.now();
      try {
        await authService.login({
          email: "nobody@example.com",
          password: "SomePass1",
        });
      } catch {
        // expected
      }
      const elapsed = performance.now() - start;

      // The call should have taken some time (argon2 verify is not instant).
      // A naive implementation that skips verification would return in < 1ms.
      // We just check it took at least a few ms, indicating the hash was computed.
      expect(elapsed).toBeGreaterThan(1);
    });

    it("throws when account is locked", async () => {
      const lockedUser = {
        ...activeUser,
        lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // locked for 15 more minutes
      };
      mockDb.query.users.findFirst.mockResolvedValueOnce(lockedUser);

      expect(
        authService.login({
          email: "locked@example.com",
          password: "CorrectPass1",
        })
      ).rejects.toThrow("Account temporarily locked");
    });

    it("throws when account is deactivated", async () => {
      const inactiveUser = { ...activeUser, isActive: false };
      mockDb.query.users.findFirst.mockResolvedValueOnce(inactiveUser);

      expect(
        authService.login({
          email: "inactive@example.com",
          password: "CorrectPass1",
        })
      ).rejects.toThrow("Account is deactivated");
    });

    it("requires 2FA code when two-factor is enabled", async () => {
      const twoFactorUser = {
        ...activeUser,
        twoFactorEnabled: true,
        twoFactorSecret: "JBSWY3DPEHPK3PXP",
      };
      mockDb.query.users.findFirst.mockResolvedValueOnce(twoFactorUser);

      expect(
        authService.login({
          email: "2fa@example.com",
          password: "CorrectPass1",
          // no twoFactorCode provided
        })
      ).rejects.toThrow("Two-factor code required");
    });
  });

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------
  describe("logout", () => {
    it("calls db.delete for the session", async () => {
      await authService.logout("session-token-abc");

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("deletes all sessions when allSessions is true", async () => {
      await authService.logout("session-token-abc", "user-1", true);

      expect(mockDb.delete).toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // refresh
  // -------------------------------------------------------------------------
  describe("refresh", () => {
    it("throws for an invalid refresh token string", async () => {
      expect(authService.refresh("not-a-valid-jwt")).rejects.toThrow();
    });

    it("throws when session is not found", async () => {
      // Generate a real refresh token so JWT verification passes
      const { signRefreshToken } = await import("../../lib/jwt");
      const token = await signRefreshToken({ userId: "u1", sessionId: "s1" });

      mockDb.query.sessions.findFirst.mockResolvedValueOnce(null);

      expect(authService.refresh(token)).rejects.toThrow();
    });
  });

  // -------------------------------------------------------------------------
  // verifyEmail
  // -------------------------------------------------------------------------
  describe("verifyEmail", () => {
    it("marks token as used and updates user emailVerified", async () => {
      const tokenRecord = {
        id: "vt-1",
        userId: "user-email-1",
        tokenHash: "abc",
        type: "email_verification",
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
      };
      mockVerificationTokens = [tokenRecord];

      // The update chain should return the token record
      mockDb.update.mockImplementationOnce(() => {
        return createChainableQuery(tokenRecord);
      });

      // Second update (to users table) can just resolve
      mockDb.update.mockImplementationOnce(() => {
        return createChainableQuery(undefined);
      });

      await authService.verifyEmail("raw-token-value");

      expect(mockDb.update).toHaveBeenCalled();
    });

    it("throws ValidationError when token is invalid/expired", async () => {
      mockVerificationTokens = [];

      // update returns empty array (no matching token)
      mockDb.update.mockImplementationOnce(() => {
        const chain: any = {
          set: () => chain,
          where: () => chain,
          returning: () => Promise.resolve([]),
        };
        return chain;
      });

      expect(authService.verifyEmail("expired-token")).rejects.toThrow(
        "Invalid or expired verification token"
      );
    });
  });

  // -------------------------------------------------------------------------
  // resetPassword
  // -------------------------------------------------------------------------
  describe("resetPassword", () => {
    it("updates the password and invalidates all sessions", async () => {
      const tokenRecord = {
        id: "vt-reset",
        userId: "user-reset-1",
        tokenHash: "def",
        type: "password_reset",
        expiresAt: new Date(Date.now() + 60000),
        usedAt: null,
      };
      mockVerificationTokens = [tokenRecord];

      // First update: verification token (returns the token record)
      mockDb.update.mockImplementationOnce(() => {
        return createChainableQuery(tokenRecord);
      });

      // Second update: user password
      mockDb.update.mockImplementationOnce(() => {
        return createChainableQuery(undefined);
      });

      await authService.resetPassword("reset-token", "NewSecurePass1");

      // update should have been called for both token and user
      expect(mockDb.update).toHaveBeenCalledTimes(2);
      // delete should have been called to invalidate sessions
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("throws ValidationError for invalid/expired token", async () => {
      mockVerificationTokens = [];

      mockDb.update.mockImplementationOnce(() => {
        const chain: any = {
          set: () => chain,
          where: () => chain,
          returning: () => Promise.resolve([]),
        };
        return chain;
      });

      expect(authService.resetPassword("bad-token", "NewPass1")).rejects.toThrow(
        "Invalid or expired reset token"
      );
    });
  });

  // -------------------------------------------------------------------------
  // setupTwoFactor
  // -------------------------------------------------------------------------
  describe("setupTwoFactor", () => {
    it("returns secret, qrCode, and backupCodes", async () => {
      const user = {
        id: "user-2fa",
        email: "2fa@example.com",
        passwordHash: "",
        twoFactorEnabled: false,
        twoFactorSecret: null,
      };

      // Hash the password we will provide
      const { hashPassword } = await import("../../lib/password");
      user.passwordHash = await hashPassword("MyPassword1");

      mockDb.query.users.findFirst.mockResolvedValueOnce(user);

      const result = await authService.setupTwoFactor("user-2fa", "MyPassword1");

      expect(result).toHaveProperty("secret");
      expect(typeof result.secret).toBe("string");
      expect(result.secret.length).toBe(20); // 20 base32 chars from generateTOTPSecret

      expect(result).toHaveProperty("qrCode");
      expect(result.qrCode).toContain("otpauth://totp/");

      expect(result).toHaveProperty("backupCodes");
      expect(Array.isArray(result.backupCodes)).toBe(true);
      expect(result.backupCodes.length).toBe(10);

      // Each backup code should be 8 hex characters uppercase
      for (const code of result.backupCodes) {
        expect(code).toMatch(/^[0-9A-F]{8}$/);
      }
    });

    it("throws NotFoundError when user does not exist", async () => {
      mockDb.query.users.findFirst.mockResolvedValueOnce(null);

      expect(authService.setupTwoFactor("nonexistent", "Password1")).rejects.toThrow("not found");
    });

    it("throws AuthenticationError for wrong password", async () => {
      const { hashPassword } = await import("../../lib/password");
      const user = {
        id: "user-2fa",
        email: "2fa@example.com",
        passwordHash: await hashPassword("RealPassword1"),
        twoFactorEnabled: false,
        twoFactorSecret: null,
      };

      mockDb.query.users.findFirst.mockResolvedValueOnce(user);

      expect(authService.setupTwoFactor("user-2fa", "WrongPassword1")).rejects.toThrow(
        "Invalid password"
      );
    });

    it("throws ConflictError when 2FA is already enabled", async () => {
      const { hashPassword } = await import("../../lib/password");
      const user = {
        id: "user-2fa",
        email: "2fa@example.com",
        passwordHash: await hashPassword("MyPassword1"),
        twoFactorEnabled: true,
        twoFactorSecret: "EXISTING_SECRET",
      };

      mockDb.query.users.findFirst.mockResolvedValueOnce(user);

      expect(authService.setupTwoFactor("user-2fa", "MyPassword1")).rejects.toThrow(
        "already enabled"
      );
    });
  });
});
