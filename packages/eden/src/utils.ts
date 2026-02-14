/**
 * Utility functions for working with the BunShip Eden client
 */

import type { BunShipClient } from "./index";
import type { ErrorResponse } from "./types";

/**
 * Custom error class for API errors
 */
export class BunShipApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(statusCode: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "BunShipApiError";
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, BunShipApiError);
    }
  }

  /**
   * Create an error from an API error response
   */
  static fromResponse(error: ErrorResponse): BunShipApiError {
    return new BunShipApiError(error.statusCode, error.message, error.details);
  }

  /**
   * Check if this is an authentication error (401 or 403)
   */
  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  /**
   * Check if this is a validation error (400 or 422)
   */
  isValidationError(): boolean {
    return this.statusCode === 400 || this.statusCode === 422;
  }

  /**
   * Check if this is a rate limit error (429)
   */
  isRateLimitError(): boolean {
    return this.statusCode === 429;
  }

  /**
   * Check if this is a server error (5xx)
   */
  isServerError(): boolean {
    return this.statusCode >= 500 && this.statusCode < 600;
  }

  /**
   * Check if this is a client error (4xx)
   */
  isClientError(): boolean {
    return this.statusCode >= 400 && this.statusCode < 500;
  }

  /**
   * Get a user-friendly error message
   */
  getUserMessage(): string {
    if (this.isAuthError()) {
      return "You need to be logged in to perform this action.";
    }
    if (this.isValidationError()) {
      return "The information provided is invalid. Please check and try again.";
    }
    if (this.isRateLimitError()) {
      return "Too many requests. Please wait a moment and try again.";
    }
    if (this.isServerError()) {
      return "Something went wrong on our end. Please try again later.";
    }
    return this.message;
  }

  /**
   * Convert to JSON representation
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

/**
 * Configuration for retry behavior
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries?: number;
  /** Initial delay in milliseconds */
  initialDelay?: number;
  /** Maximum delay in milliseconds */
  maxDelay?: number;
  /** Exponential backoff multiplier */
  backoffMultiplier?: number;
  /** HTTP status codes that should trigger a retry */
  retryableStatusCodes?: number[];
  /** Callback called on each retry attempt */
  onRetry?: (attempt: number, error: BunShipApiError) => void;
}

const DEFAULT_RETRY_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  onRetry: () => {},
};

/**
 * Execute a request with automatic retry logic
 *
 * @example
 * ```typescript
 * const result = await withRetry(
 *   () => client.organizations.get(),
 *   { maxRetries: 5, initialDelay: 2000 }
 * );
 * ```
 */
export async function withRetry<T>(
  fn: () => Promise<{ data?: T; error?: ErrorResponse; status: number }>,
  config: RetryConfig = {}
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: BunShipApiError | null = null;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const result = await fn();

      if (result.error) {
        const error = BunShipApiError.fromResponse(result.error);

        // Check if this error is retryable
        if (attempt < cfg.maxRetries && cfg.retryableStatusCodes.includes(error.statusCode)) {
          lastError = error;

          // Calculate delay with exponential backoff
          const delay = Math.min(
            cfg.initialDelay * Math.pow(cfg.backoffMultiplier, attempt),
            cfg.maxDelay
          );

          cfg.onRetry(attempt + 1, error);

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        // Non-retryable error or max retries reached
        throw error;
      }

      // Success
      return result.data as T;
    } catch (error) {
      // Network or other errors
      if (error instanceof BunShipApiError) {
        throw error;
      }

      // For network errors, retry if attempts remain
      if (attempt < cfg.maxRetries) {
        const delay = Math.min(
          cfg.initialDelay * Math.pow(cfg.backoffMultiplier, attempt),
          cfg.maxDelay
        );

        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }

  // Max retries exceeded
  throw lastError || new Error("Max retries exceeded");
}

/**
 * Token storage interface for managing auth tokens
 */
export interface TokenStorage {
  getAccessToken(): string | null;
  setAccessToken(token: string): void;
  getRefreshToken(): string | null;
  setRefreshToken(token: string): void;
  clear(): void;
}

/**
 * In-memory token storage (not persistent across restarts)
 */
export class MemoryTokenStorage implements TokenStorage {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  getAccessToken(): string | null {
    return this.accessToken;
  }

  setAccessToken(token: string): void {
    this.accessToken = token;
  }

  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  setRefreshToken(token: string): void {
    this.refreshToken = token;
  }

  clear(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }
}

/**
 * Browser localStorage token storage (persists across sessions)
 */
export class LocalStorageTokenStorage implements TokenStorage {
  private accessTokenKey: string;
  private refreshTokenKey: string;

  constructor(accessTokenKey = "bunship_access_token", refreshTokenKey = "bunship_refresh_token") {
    this.accessTokenKey = accessTokenKey;
    this.refreshTokenKey = refreshTokenKey;
  }

  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.accessTokenKey);
  }

  setAccessToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.accessTokenKey, token);
  }

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(this.refreshTokenKey);
  }

  setRefreshToken(token: string): void {
    if (typeof window === "undefined") return;
    localStorage.setItem(this.refreshTokenKey, token);
  }

  clear(): void {
    if (typeof window === "undefined") return;
    localStorage.removeItem(this.accessTokenKey);
    localStorage.removeItem(this.refreshTokenKey);
  }
}

/**
 * Client wrapper that manages authentication and token refresh automatically
 */
export class AuthenticatedClient {
  private baseUrl: string;
  private storage: TokenStorage;
  private onTokenRefresh?: (accessToken: string) => void;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(
    baseUrl: string,
    storage: TokenStorage = new MemoryTokenStorage(),
    options?: {
      onTokenRefresh?: (accessToken: string) => void;
    }
  ) {
    this.baseUrl = baseUrl;
    this.storage = storage;
    this.onTokenRefresh = options?.onTokenRefresh;
  }

  /**
   * Get a client instance with the current access token
   */
  getClient(): BunShipClient {
    const { createClient } = require("./index");
    const accessToken = this.storage.getAccessToken();

    return createClient(this.baseUrl, {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    });
  }

  /**
   * Login and store tokens
   */
  async login(email: string, password: string) {
    const client = this.getClient();
    const result = await client.auth.login.post({ email, password });

    if (result.error) {
      throw BunShipApiError.fromResponse(result.error);
    }

    this.storage.setAccessToken(result.data.accessToken);
    this.storage.setRefreshToken(result.data.refreshToken);

    return result.data;
  }

  /**
   * Logout and clear tokens
   */
  async logout() {
    try {
      const client = this.getClient();
      await client.auth.logout.post();
    } finally {
      this.storage.clear();
    }
  }

  /**
   * Refresh the access token
   */
  async refreshToken(): Promise<void> {
    // Prevent concurrent refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this._performRefresh();

    try {
      await this.refreshPromise;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async _performRefresh(): Promise<void> {
    const refreshToken = this.storage.getRefreshToken();
    if (!refreshToken) {
      throw new BunShipApiError(401, "No refresh token available");
    }

    const client = this.getClient();
    const result = await client.auth.refresh.post({ refreshToken });

    if (result.error) {
      // Refresh failed - clear tokens
      this.storage.clear();
      throw BunShipApiError.fromResponse(result.error);
    }

    // Update tokens (must store both — server rotates refresh tokens)
    this.storage.setAccessToken(result.data.accessToken);
    if (result.data.refreshToken) {
      this.storage.setRefreshToken(result.data.refreshToken);
    }

    // Notify callback
    if (this.onTokenRefresh) {
      this.onTokenRefresh(result.data.accessToken);
    }
  }

  /**
   * Execute a request with automatic token refresh on 401 errors
   */
  async withAuth<T>(
    fn: (client: BunShipClient) => Promise<{
      data?: T;
      error?: ErrorResponse;
      status: number;
    }>
  ): Promise<T> {
    let client = this.getClient();
    let result = await fn(client);

    // If unauthorized, try refreshing token once
    if (result.error && result.status === 401) {
      await this.refreshToken();

      // Retry with new token
      client = this.getClient();
      result = await fn(client);
    }

    if (result.error) {
      throw BunShipApiError.fromResponse(result.error);
    }

    return result.data as T;
  }

  /**
   * Check if the user is currently authenticated
   */
  isAuthenticated(): boolean {
    return this.storage.getAccessToken() !== null;
  }
}

/**
 * Create a request logger middleware
 */
export function createRequestLogger(
  logger: (message: string, data?: unknown) => void = console.log
) {
  return {
    onRequest: (path: string, options: RequestInit) => {
      logger(`[API Request] ${options.method || "GET"} ${path}`, {
        headers: options.headers,
      });
    },
    onResponse: (response: Response) => {
      logger(`[API Response] ${response.status} ${response.statusText}`, {
        url: response.url,
      });
    },
  };
}

/**
 * Batch multiple requests and execute them concurrently
 *
 * @example
 * ```typescript
 * const [orgs, profile] = await batchRequests([
 *   () => client.organizations.get(),
 *   () => client.auth.me.get(),
 * ]);
 * ```
 */
export async function batchRequests<T extends unknown[]>(
  requests: Array<() => Promise<{ data?: unknown; error?: ErrorResponse; status: number }>>
): Promise<T> {
  const results = await Promise.allSettled(requests.map((fn) => fn()));

  return results.map((result, index) => {
    if (result.status === "rejected") {
      throw result.reason;
    }

    const response = result.value;
    if (response.error) {
      throw BunShipApiError.fromResponse(response.error);
    }

    return response.data;
  }) as T;
}

/**
 * Helper to safely extract data from a response, throwing on error
 */
export function unwrapResponse<T>(response: {
  data?: T;
  error?: ErrorResponse;
  status: number;
}): T {
  if (response.error) {
    throw BunShipApiError.fromResponse(response.error);
  }

  if (response.data === undefined) {
    throw new Error("Response data is undefined");
  }

  return response.data;
}
