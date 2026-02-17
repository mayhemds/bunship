/**
 * JWT utilities for access and refresh tokens
 */
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { appConfig } from "@bunship/config";

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error("JWT_SECRET must be set and at least 32 characters");
}
if (!process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) {
  throw new Error("JWT_REFRESH_SECRET must be set and at least 32 characters");
}

const accessSecret = new TextEncoder().encode(process.env.JWT_SECRET);
const refreshSecret = new TextEncoder().encode(process.env.JWT_REFRESH_SECRET);

export interface AccessTokenPayload extends JWTPayload {
  userId: string;
  email: string;
  sessionId: string;
}

export interface RefreshTokenPayload extends JWTPayload {
  userId: string;
  sessionId: string;
}

/**
 * Sign an access token (short-lived)
 */
export async function signAccessToken(payload: {
  userId: string;
  email: string;
  sessionId: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(appConfig.jwt.issuer)
    .setAudience("bunship-api")
    .setExpirationTime(appConfig.jwt.accessTokenExpiry)
    .sign(accessSecret);
}

/**
 * Sign a refresh token (long-lived)
 */
export async function signRefreshToken(payload: {
  userId: string;
  sessionId: string;
}): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(appConfig.jwt.issuer)
    .setAudience("bunship-api")
    .setExpirationTime(appConfig.jwt.refreshTokenExpiry)
    .sign(refreshSecret);
}

/**
 * Verify an access token
 */
export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret, {
    issuer: appConfig.jwt.issuer,
    audience: "bunship-api",
  });
  return payload as AccessTokenPayload;
}

/**
 * Verify a refresh token
 */
export async function verifyRefreshToken(token: string): Promise<RefreshTokenPayload> {
  const { payload } = await jwtVerify(token, refreshSecret, {
    issuer: appConfig.jwt.issuer,
    audience: "bunship-api",
  });
  return payload as RefreshTokenPayload;
}

/**
 * Generate token pair (access + refresh)
 */
export async function generateTokenPair(user: {
  id: string;
  email: string;
  sessionId: string;
}): Promise<{ accessToken: string; refreshToken: string }> {
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken({ userId: user.id, email: user.email, sessionId: user.sessionId }),
    signRefreshToken({ userId: user.id, sessionId: user.sessionId }),
  ]);
  return { accessToken, refreshToken };
}
