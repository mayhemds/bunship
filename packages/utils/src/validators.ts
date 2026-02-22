/**
 * Validation utilities for common input patterns
 */

/**
 * Email validation regex
 * Follows RFC 5322 simplified pattern
 */
export const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Slug validation regex
 * Lowercase letters, numbers, and hyphens only
 * Must start and end with alphanumeric
 */
export const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * URL validation regex
 * Supports http, https, and common TLDs
 */
export const urlRegex =
  /^https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)$/;

/**
 * Validate email address format
 */
export function isValidEmail(email: string): boolean {
  if (typeof email !== "string") return false;
  return emailRegex.test(email.trim());
}

/**
 * Validate slug format
 * Slugs are used for URL-friendly identifiers
 */
export function isValidSlug(slug: string): boolean {
  if (typeof slug !== "string") return false;
  return slugRegex.test(slug.trim());
}

/**
 * Password validation configuration
 */
export interface PasswordConfig {
  minLength?: number;
  maxLength?: number;
  requireUppercase?: boolean;
  requireLowercase?: boolean;
  requireNumbers?: boolean;
  requireSpecialChars?: boolean;
}

/**
 * Default password configuration
 * Requires: 8+ chars, uppercase, lowercase, number
 */
const DEFAULT_PASSWORD_CONFIG: Required<PasswordConfig> = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: false,
};

/**
 * Validate password strength based on configuration
 * @returns true if valid, error message string if invalid
 */
export function isValidPassword(password: string, config: PasswordConfig = {}): true | string {
  if (typeof password !== "string") {
    return "Password must be a string";
  }

  const rules = { ...DEFAULT_PASSWORD_CONFIG, ...config };

  if (password.length < rules.minLength) {
    return `Password must be at least ${rules.minLength} characters`;
  }

  if (password.length > rules.maxLength) {
    return `Password must be no more than ${rules.maxLength} characters`;
  }

  if (rules.requireUppercase && !/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (rules.requireLowercase && !/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  if (rules.requireNumbers && !/\d/.test(password)) {
    return "Password must contain at least one number";
  }

  if (rules.requireSpecialChars && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return "Password must contain at least one special character";
  }

  return true;
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
  if (typeof url !== "string") return false;
  return urlRegex.test(url.trim());
}

/**
 * Convert text to valid slug format
 * - Converts to lowercase
 * - Replaces spaces and special chars with hyphens
 * - Removes consecutive hyphens
 * - Trims leading/trailing hyphens
 */
export function sanitizeSlug(text: string): string {
  if (typeof text !== "string") return "";

  return text
    .toLowerCase()
    .trim()
    .normalize("NFD") // Decompose accented characters
    .replace(/[\u0300-\u036f]/g, "") // Remove diacritics
    .replace(/[^a-z0-9\s-]/g, "") // Remove invalid chars
    .replace(/[\s_]+/g, "-") // Replace spaces/underscores with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ""); // Trim leading/trailing hyphens
}

/**
 * Validate if a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validate if a value is a positive integer
 */
export function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

/**
 * Validate if a value is within a range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === "number" && value >= min && value <= max;
}

/**
 * Validate if a string matches minimum and maximum length
 */
export function isValidLength(value: string, min: number, max: number): true | string {
  if (typeof value !== "string") {
    return "Value must be a string";
  }

  const length = value.length;

  if (length < min) {
    return `Must be at least ${min} characters`;
  }

  if (length > max) {
    return `Must be no more than ${max} characters`;
  }

  return true;
}
