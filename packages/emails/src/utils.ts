/**
 * Email template utilities
 * Helper functions for formatting and rendering emails
 */

/**
 * Format currency amount for display
 * @param amount - Amount in cents
 * @param currency - Currency code (USD, EUR, etc.)
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // If amount is in cents, convert to dollars
  const amountInDollars = amount >= 100 ? amount / 100 : amount;

  return formatter.format(amountInDollars);
}

/**
 * Format date for display in emails
 * @param date - Date object or ISO string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
    ...options,
  };

  return new Intl.DateTimeFormat("en-US", defaultOptions).format(dateObj);
}

/**
 * Format billing period from start and end dates
 * @param startDate - Period start date
 * @param endDate - Period end date
 * @returns Formatted billing period string
 */
export function formatBillingPeriod(startDate: Date | string, endDate: Date | string): string {
  const start = formatDate(startDate, { month: "short", day: "numeric" });
  const end = formatDate(endDate, { month: "short", day: "numeric", year: "numeric" });

  return `${start} - ${end}`;
}

/**
 * Get relative time string (e.g., "in 1 hour", "in 7 days")
 * @param date - Future date
 * @returns Relative time string
 */
export function getRelativeTime(date: Date | string): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();

  if (diffMs < 0) {
    return "expired";
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 60) {
    return `in ${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""}`;
  } else if (diffHours < 24) {
    return `in ${diffHours} hour${diffHours !== 1 ? "s" : ""}`;
  } else {
    return `in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  }
}

/**
 * Truncate text to a maximum length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }

  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Get expiry warning text based on time remaining
 * @param expiryDate - Expiry date
 * @returns Warning text or null
 */
export function getExpiryWarning(expiryDate: Date | string): string | null {
  const dateObj = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  const now = new Date();
  const diffMs = dateObj.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffMs <= 0) {
    return "⚠️ This link has expired";
  } else if (diffHours < 1) {
    return "⏰ This link expires in less than 1 hour";
  } else if (diffHours < 24) {
    return `⏰ This link expires in ${diffHours} hours`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    return `⏰ This link expires in ${diffDays} day${diffDays !== 1 ? "s" : ""}`;
  }
}

/**
 * Capitalize first letter of each word
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export function capitalize(text: string): string {
  return text
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Generate a preview text from email content
 * Removes HTML tags and truncates to a reasonable length
 * @param html - HTML content
 * @param maxLength - Maximum preview length
 * @returns Plain text preview
 */
export function generatePreviewText(html: string, maxLength: number = 100): string {
  // Remove HTML tags
  const text = html.replace(/<[^>]*>/g, "");

  // Decode HTML entities
  const decoded = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"');

  // Trim and truncate
  return truncate(decoded.trim(), maxLength);
}

/**
 * Validate email address format
 * @param email - Email address to validate
 * @returns True if valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Mask email for privacy (e.g., "user@example.com" -> "u***@example.com")
 * @param email - Email address to mask
 * @returns Masked email
 */
export function maskEmail(email: string): string {
  const [localPart, domain] = email.split("@");

  if (!localPart || !domain) {
    return email;
  }

  const masked = localPart.charAt(0) + "***";
  return `${masked}@${domain}`;
}

/**
 * Generate UTM parameters for tracking email links
 * @param source - UTM source (e.g., "email")
 * @param medium - UTM medium (e.g., "welcome-email")
 * @param campaign - UTM campaign name
 * @returns URL search params string
 */
export function generateUTMParams(
  source: string = "email",
  medium: string,
  campaign?: string
): string {
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: medium,
  });

  if (campaign) {
    params.set("utm_campaign", campaign);
  }

  return params.toString();
}

/**
 * Add UTM parameters to a URL
 * @param url - Base URL
 * @param source - UTM source
 * @param medium - UTM medium
 * @param campaign - UTM campaign
 * @returns URL with UTM parameters
 */
export function addUTMToUrl(
  url: string,
  source: string = "email",
  medium: string,
  campaign?: string
): string {
  const utmParams = generateUTMParams(source, medium, campaign);
  const separator = url.includes("?") ? "&" : "?";

  return `${url}${separator}${utmParams}`;
}
