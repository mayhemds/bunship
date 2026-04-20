/**
 * Example usage of the BunShip Eden client
 *
 * This file demonstrates how to use the type-safe API client
 * in various scenarios. It's meant as a reference and is not
 * included in the package build.
 */

import { createClient, type BunShipClient } from "./index";
import type { AuthResponse, ErrorResponse, OrganizationResponse, PaginationParams } from "./types";

// ============================================================================
// Basic Usage
// ============================================================================

async function basicExample() {
  // Create a client instance
  const client = createClient("http://localhost:3000");

  // Health check
  const health = await client.health.get();
  console.log(health.data); // { status: "ok", timestamp: "..." }

  // Root endpoint
  const root = await client.index.get();
  console.log(root.data); // { message: "BunShip API", status: "running" }
}

// ============================================================================
// Authentication Flow
// ============================================================================

async function authenticationExample() {
  const client = createClient("http://localhost:3000");

  // Login
  const loginResult = await client.auth.login.post({
    email: "user@example.com",
    password: "secure_password",
  });

  if (loginResult.error) {
    console.error("Login failed:", loginResult.error);
    return;
  }

  const { accessToken, refreshToken, user } = loginResult.data;
  console.log(`Logged in as ${user.email}`);

  // Create authenticated client
  const authClient = createClient("http://localhost:3000", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Get current user profile
  const profileResult = await authClient.auth.me.get();
  if (profileResult.data) {
    console.log("Profile:", profileResult.data);
  }

  // Refresh token (when access token expires)
  const refreshResult = await client.auth.refresh.post({
    refreshToken,
  });

  if (refreshResult.data) {
    const newAccessToken = refreshResult.data.accessToken;
    console.log("Token refreshed:", newAccessToken);
  }

  // Logout
  await authClient.auth.logout.post();
  console.log("Logged out");
}

// ============================================================================
// Organization Management
// ============================================================================

async function organizationExample(accessToken: string) {
  const client = createClient("http://localhost:3000", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // List organizations
  const orgsResult = await client.organizations.get();
  if (orgsResult.data) {
    console.log("Organizations:", orgsResult.data);
  }

  // Get specific organization
  const orgResult = await client.organizations({ id: "org_123" }).get();
  if (orgResult.data) {
    console.log("Organization:", orgResult.data);
  }

  // Create organization
  const createResult = await client.organizations.post({
    name: "My Company",
    slug: "my-company",
  });

  if (createResult.data) {
    console.log("Created:", createResult.data);
  }

  // Update organization
  const updateResult = await client.organizations({ id: "org_123" }).patch({
    name: "Updated Name",
  });

  if (updateResult.data) {
    console.log("Updated:", updateResult.data);
  }

  // Delete organization
  await client.organizations({ id: "org_123" }).delete();
  console.log("Organization deleted");
}

// ============================================================================
// Error Handling
// ============================================================================

async function errorHandlingExample() {
  const client = createClient("http://localhost:3000");

  // Method 1: Check for error property
  const result = await client.auth.login.post({
    email: "user@example.com",
    password: "wrong_password",
  });

  if (result.error) {
    console.error(`Error ${result.status}: ${result.error.message}`);

    // Handle specific error codes
    if (result.status === 401) {
      console.log("Invalid credentials - please try again");
    } else if (result.status === 429) {
      console.log("Too many attempts - please wait");
    }
  } else {
    console.log("Login successful:", result.data);
  }

  // Method 2: Try-catch for network errors
  try {
    const response = await client.health.get();
    console.log(response.data);
  } catch (error) {
    console.error("Network error:", error);
  }
}

// ============================================================================
// Pagination
// ============================================================================

async function paginationExample(accessToken: string) {
  const client = createClient("http://localhost:3000", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const params: PaginationParams = {
    page: 1,
    limit: 20,
    sort: "createdAt",
    order: "desc",
  };

  const result = await client.organizations.get({ query: params });

  if (result.data) {
    const { data, pagination } = result.data;

    console.log(`Page ${pagination.page} of ${pagination.totalPages}`);
    console.log(`Total items: ${pagination.total}`);
    console.log(`Has more: ${pagination.hasMore}`);

    data.forEach((org: any) => {
      console.log(`- ${org.name} (${org.slug})`);
    });

    // Fetch next page if available
    if (pagination.hasMore) {
      const nextPage = await client.organizations.get({
        query: { ...params, page: pagination.page + 1 },
      });
      console.log("Next page:", nextPage.data);
    }
  }
}

// ============================================================================
// API Key Management
// ============================================================================

async function apiKeyExample(accessToken: string) {
  const client = createClient("http://localhost:3000", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Create API key
  const createResult = await client.api.keys.post({
    name: "Production Key",
    expiresIn: 365, // days
  });

  if (createResult.data) {
    // IMPORTANT: Save this key - it's only shown once!
    const { key, prefix, id } = createResult.data;
    console.log("API Key created:");
    console.log("  Key:", key);
    console.log("  Prefix:", prefix);
    console.log("  ID:", id);
  }

  // List API keys
  const listResult = await client.api.keys.get();
  if (listResult.data) {
    console.log("Your API keys:");
    listResult.data.forEach((key: any) => {
      console.log(`  - ${key.name} (${key.prefix}...)`);
      console.log(`    Created: ${key.createdAt}`);
      console.log(`    Last used: ${key.lastUsedAt || "Never"}`);
    });
  }

  // Get specific key details
  const keyResult = await client.api.keys({ id: "key_123" }).get();
  if (keyResult.data) {
    console.log("Key details:", keyResult.data);
  }

  // Revoke API key
  const deleteResult = await client.api.keys({ id: "key_123" }).delete();
  if (deleteResult.data) {
    console.log("API key revoked");
  }
}

// ============================================================================
// Reusable Client Pattern
// ============================================================================

class ApiClientManager {
  private client: BunShipClient;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private baseUrl: string;

  constructor(baseUrl: string = "http://localhost:3000") {
    this.baseUrl = baseUrl;
    this.client = createClient(baseUrl);
  }

  async login(email: string, password: string) {
    const result = await this.client.auth.login.post({ email, password });

    if (result.error) {
      throw new Error(`Login failed: ${result.error.message}`);
    }

    this.accessToken = result.data.accessToken;
    this.refreshToken = result.data.refreshToken;
    this.updateClient();

    return result.data;
  }

  async logout() {
    if (!this.accessToken) return;

    await this.client.auth.logout.post();
    this.accessToken = null;
    this.refreshToken = null;
    this.updateClient();
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const result = await this.client.auth.refresh.post({
      refreshToken: this.refreshToken,
    });

    if (result.error) {
      throw new Error(`Token refresh failed: ${result.error.message}`);
    }

    this.accessToken = result.data.accessToken;
    this.updateClient();

    return result.data;
  }

  private updateClient() {
    this.client = createClient(this.baseUrl, {
      headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {},
    });
  }

  getClient(): BunShipClient {
    return this.client;
  }

  isAuthenticated(): boolean {
    return this.accessToken !== null;
  }
}

// Usage of ApiClientManager
async function managedClientExample() {
  const manager = new ApiClientManager("http://localhost:3000");

  // Login
  const authData = await manager.login("user@example.com", "password");
  console.log("Logged in:", authData.user.email);

  // Use authenticated client
  const client = manager.getClient();
  const profile = await client.auth.me.get();
  console.log("Profile:", profile.data);

  // Check authentication status
  if (manager.isAuthenticated()) {
    console.log("User is authenticated");
  }

  // Refresh token when needed
  try {
    await manager.refreshAccessToken();
    console.log("Token refreshed");
  } catch (error) {
    console.error("Refresh failed:", error);
  }

  // Logout
  await manager.logout();
  console.log("Logged out");
}

// ============================================================================
// Custom Error Handling
// ============================================================================

class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }

  static fromResponse(error: ErrorResponse): ApiError {
    return new ApiError(error.statusCode, error.message, error.details);
  }

  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403;
  }

  isValidationError(): boolean {
    return this.statusCode === 400 || this.statusCode === 422;
  }

  isRateLimitError(): boolean {
    return this.statusCode === 429;
  }

  isServerError(): boolean {
    return this.statusCode >= 500;
  }
}

async function customErrorHandlingExample() {
  const client = createClient("http://localhost:3000");

  try {
    const result = await client.auth.login.post({
      email: "user@example.com",
      password: "wrong_password",
    });

    if (result.error) {
      throw ApiError.fromResponse(result.error);
    }

    console.log("Login successful:", result.data);
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.isAuthError()) {
        console.error("Authentication failed - check credentials");
      } else if (error.isValidationError()) {
        console.error("Invalid input:", error.details);
      } else if (error.isRateLimitError()) {
        console.error("Too many requests - please wait");
      } else if (error.isServerError()) {
        console.error("Server error - please try again later");
      }
    } else {
      console.error("Unexpected error:", error);
    }
  }
}

// ============================================================================
// Export examples for reference
// ============================================================================

export {
  basicExample,
  authenticationExample,
  organizationExample,
  errorHandlingExample,
  paginationExample,
  apiKeyExample,
  managedClientExample,
  customErrorHandlingExample,
  ApiClientManager,
  ApiError,
};
