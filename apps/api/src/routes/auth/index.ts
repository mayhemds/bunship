/**
 * Authentication Routes
 * Handles user registration, login, password reset, 2FA, and email verification
 */
import { Elysia } from "elysia";
import { rateLimit } from "elysia-rate-limit";
import { authMiddleware } from "../../middleware/auth";
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailParamsSchema,
  TwoFactorSetupSchema,
  TwoFactorVerifySchema,
  TwoFactorDisableSchema,
  LogoutSchema,
  AuthTokensResponse,
  TwoFactorSetupResponse,
  MessageResponse,
  ErrorResponse,
} from "./schemas";
import * as authService from "../../services/auth.service";
import { ValidationError } from "@bunship/utils";

export const authRoutes = new Elysia({ prefix: "/auth" })
  // General rate limit for all auth routes: configurable via env (default 20/min)
  .use(
    rateLimit({
      max: parseInt(process.env.RATE_LIMIT_AUTH || "20", 10),
      duration: 60 * 1000,
      scoping: "scoped",
      generator: (req, server) => server?.requestIP(req)?.address ?? "unknown",
    })
  )
  /**
   * POST /auth/register
   * Register a new user account
   */
  .post(
    "/register",
    async ({ body }) => {
      const result = await authService.register(body);

      return {
        message: "Registration successful. Please check your email to verify your account.",
        userId: result.userId,
      };
    },
    {
      body: RegisterSchema,
      response: {
        200: MessageResponse,
        400: ErrorResponse,
        409: ErrorResponse,
      },
      detail: {
        tags: ["Auth"],
        summary: "Register new user",
        description:
          "Create a new user account. Sends verification email to confirm email address.",
      },
    }
  )

  /**
   * POST /auth/login
   * Login with email and password
   */
  .post(
    "/login",
    async ({ body, request }) => {
      const result = await authService.login({
        email: body.email,
        password: body.password,
        twoFactorCode: body.twoFactorCode,
        userAgent: request.headers.get("user-agent") || undefined,
        ipAddress:
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          request.headers.get("x-real-ip") ||
          undefined,
      });

      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
        user: result.user,
      };
    },
    {
      body: LoginSchema,
      response: {
        200: AuthTokensResponse,
        401: ErrorResponse,
      },
      detail: {
        tags: ["Auth"],
        summary: "Login user",
        description:
          "Authenticate with email and password. Returns JWT tokens. If 2FA is enabled, include twoFactorCode.",
      },
    }
  )

  /**
   * POST /auth/refresh
   * Refresh access token
   */
  .post(
    "/refresh",
    async ({ body }) => {
      const result = await authService.refresh(body.refreshToken);

      return {
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        expiresIn: result.expiresIn,
      };
    },
    {
      body: RefreshSchema,
      response: {
        200: AuthTokensResponse,
        401: ErrorResponse,
      },
      detail: {
        tags: ["Auth"],
        summary: "Refresh access token",
        description:
          "Use refresh token to get new access token. Rotates refresh token for security.",
      },
    }
  )

  /**
   * POST /auth/forgot-password
   * Request password reset email (public — no auth required)
   */
  .post(
    "/forgot-password",
    async ({ body }) => {
      await authService.forgotPassword(body.email);

      return {
        message: "If an account exists with that email, a password reset link has been sent.",
      };
    },
    {
      body: ForgotPasswordSchema,
      response: {
        200: MessageResponse,
      },
      detail: {
        tags: ["Auth"],
        summary: "Request password reset",
        description:
          "Send password reset email. Always returns success to prevent email enumeration.",
      },
    }
  )

  /**
   * POST /auth/reset-password
   * Reset password with token (public — no auth required)
   */
  .post(
    "/reset-password",
    async ({ body }) => {
      await authService.resetPassword(body.token, body.password);

      return {
        message: "Password reset successfully. Please login with your new password.",
      };
    },
    {
      body: ResetPasswordSchema,
      response: {
        200: MessageResponse,
        400: ErrorResponse,
      },
      detail: {
        tags: ["Auth"],
        summary: "Reset password",
        description: "Complete password reset using token from email. Invalidates all sessions.",
      },
    }
  )

  /**
   * GET /auth/verify-email/:token
   * Verify email address (public — no auth required)
   */
  .get(
    "/verify-email/:token",
    async ({ params }) => {
      await authService.verifyEmail(params.token);

      return {
        message: "Email verified successfully. You can now login.",
      };
    },
    {
      params: VerifyEmailParamsSchema,
      response: {
        200: MessageResponse,
        400: ErrorResponse,
      },
      detail: {
        tags: ["Auth"],
        summary: "Verify email address",
        description: "Confirm email address using token from verification email.",
      },
    }
  )

  /**
   * POST /auth/logout
   * Logout user and revoke session
   */
  .use(authMiddleware)
  .post(
    "/logout",
    async ({ user, body }) => {
      const allSessions = body?.allSessions ?? false;

      await authService.logout(user.sessionId, user.id, allSessions);

      return {
        message: allSessions ? "Logged out from all sessions" : "Logged out successfully",
      };
    },
    {
      body: LogoutSchema,
      response: {
        200: MessageResponse,
        401: ErrorResponse,
      },
      detail: {
        tags: ["Auth"],
        summary: "Logout user",
        description: "Revoke current session. Set allSessions=true to logout from all devices.",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * POST /auth/two-factor/setup
   * Initiate two-factor authentication setup
   */
  .use(authMiddleware)
  .post(
    "/two-factor/setup",
    async ({ user, body }) => {
      const result = await authService.setupTwoFactor(user.id, body.password);

      return {
        secret: result.secret,
        qrCode: result.qrCode,
        backupCodes: result.backupCodes,
      };
    },
    {
      body: TwoFactorSetupSchema,
      response: {
        200: TwoFactorSetupResponse,
        401: ErrorResponse,
        409: ErrorResponse,
      },
      detail: {
        tags: ["Auth"],
        summary: "Setup two-factor authentication",
        description:
          "Generate TOTP secret and QR code. Scan QR code with authenticator app, then verify with /two-factor/verify.",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * POST /auth/two-factor/verify
   * Verify and enable two-factor authentication
   */
  .use(authMiddleware)
  .post(
    "/two-factor/verify",
    async ({ user, body }) => {
      await authService.verifyTwoFactor(user.id, body.code);

      return {
        message: "Two-factor authentication enabled successfully.",
      };
    },
    {
      body: TwoFactorVerifySchema,
      response: {
        200: MessageResponse,
        401: ErrorResponse,
        404: ErrorResponse,
        409: ErrorResponse,
      },
      detail: {
        tags: ["Auth"],
        summary: "Enable two-factor authentication",
        description: "Verify TOTP code and enable 2FA. Must call /two-factor/setup first.",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  /**
   * POST /auth/two-factor/disable
   * Disable two-factor authentication
   */
  .use(authMiddleware)
  .post(
    "/two-factor/disable",
    async ({ user, body }) => {
      await authService.disableTwoFactor(user.id, body.password, body.code);

      return {
        message: "Two-factor authentication disabled successfully.",
      };
    },
    {
      body: TwoFactorDisableSchema,
      response: {
        200: MessageResponse,
        400: ErrorResponse,
        401: ErrorResponse,
        404: ErrorResponse,
      },
      detail: {
        tags: ["Auth"],
        summary: "Disable two-factor authentication",
        description: "Disable 2FA by providing current password and valid TOTP code.",
        security: [{ bearerAuth: [] }],
      },
    }
  );
