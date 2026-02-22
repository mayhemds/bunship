/**
 * Formatting utilities for common data types
 */

/**
 * Date format options
 */
export type DateFormat = "short" | "medium" | "long" | "iso" | "relative";

/**
 * Format a date according to specified format
 * @param date - Date to format (Date object, timestamp, or ISO string)
 * @param format - Format type (default: "medium")
 * @param locale - Locale for formatting (default: "en-US")
 * @returns Formatted date string
 */
export function formatDate(
  date: Date | number | string,
  format: DateFormat = "medium",
  locale = "en-US"
): string {
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {
    return "Invalid date";
  }

  switch (format) {
    case "short":
      return dateObj.toLocaleDateString(locale, {
        month: "numeric",
        day: "numeric",
        year: "2-digit",
      });

    case "medium":
      return dateObj.toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

    case "long":
      return dateObj.toLocaleDateString(locale, {
        month: "long",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });

    case "iso":
      return dateObj.toISOString();

    case "relative":
      return formatRelativeTime(dateObj);

    default:
      return dateObj.toLocaleDateString(locale);
  }
}

/**
 * Format a date as relative time (e.g., "2 hours ago", "in 3 days")
 * @param date - Date to format
 * @returns Relative time string
 */
export function formatRelativeTime(date: Date | number | string): string {
  const dateObj = typeof date === "string" || typeof date === "number" ? new Date(date) : date;

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  const isPast = diffMs > 0;
  const prefix = isPast ? "" : "in ";
  const suffix = isPast ? " ago" : "";

  const absValue = Math.abs;

  if (absValue(diffSecs) < 60) {
    return "just now";
  } else if (absValue(diffMins) < 60) {
    const val = absValue(diffMins);
    return `${prefix}${val} ${val === 1 ? "minute" : "minutes"}${suffix}`;
  } else if (absValue(diffHours) < 24) {
    const val = absValue(diffHours);
    return `${prefix}${val} ${val === 1 ? "hour" : "hours"}${suffix}`;
  } else if (absValue(diffDays) < 7) {
    const val = absValue(diffDays);
    return `${prefix}${val} ${val === 1 ? "day" : "days"}${suffix}`;
  } else if (absValue(diffWeeks) < 4) {
    const val = absValue(diffWeeks);
    return `${prefix}${val} ${val === 1 ? "week" : "weeks"}${suffix}`;
  } else if (absValue(diffMonths) < 12) {
    const val = absValue(diffMonths);
    return `${prefix}${val} ${val === 1 ? "month" : "months"}${suffix}`;
  } else {
    const val = absValue(diffYears);
    return `${prefix}${val} ${val === 1 ? "year" : "years"}${suffix}`;
  }
}

/**
 * Currency symbols map
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  CNY: "¥",
  INR: "₹",
  AUD: "A$",
  CAD: "C$",
  CHF: "Fr",
  BRL: "R$",
  KRW: "₩",
};

/**
 * Format a number as currency
 * @param amount - Amount in smallest currency unit (e.g., cents for USD)
 * @param currency - ISO currency code (default: "USD")
 * @param locale - Locale for formatting (default: "en-US")
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency = "USD", locale = "en-US"): string {
  // Convert from smallest unit to main unit (cents to dollars)
  const mainAmount = amount / 100;

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
    }).format(mainAmount);
  } catch {
    // Fallback if currency is not supported
    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    return `${symbol}${mainAmount.toFixed(2)}`;
  }
}

/**
 * Format bytes to human-readable file size
 * @param bytes - Number of bytes
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted size string (e.g., "1.5 MB")
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);

  return `${value.toFixed(dm)} ${sizes[i]}`;
}

/**
 * Truncate text to specified length with ellipsis
 * @param text - Text to truncate
 * @param maxLength - Maximum length including ellipsis
 * @param ellipsis - Ellipsis string (default: "...")
 * @returns Truncated text
 */
export function truncate(text: string, maxLength: number, ellipsis = "..."): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.slice(0, maxLength - ellipsis.length);
  return truncated + ellipsis;
}

/**
 * Convert text to URL-friendly slug
 * @param text - Text to convert
 * @returns Slugified text
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Format a number with thousand separators
 * @param num - Number to format
 * @param locale - Locale for formatting (default: "en-US")
 * @returns Formatted number string
 */
export function formatNumber(num: number, locale = "en-US"): string {
  return new Intl.NumberFormat(locale).format(num);
}

/**
 * Format a percentage
 * @param value - Value to format (0-1 or 0-100)
 * @param decimals - Number of decimal places (default: 0)
 * @param asDecimal - Whether value is decimal (0-1) or percentage (0-100)
 * @returns Formatted percentage string
 */
export function formatPercentage(value: number, decimals = 0, asDecimal = true): string {
  const percentage = asDecimal ? value * 100 : value;
  return `${percentage.toFixed(decimals)}%`;
}

/**
 * Format a duration in milliseconds to human-readable string
 * @param ms - Duration in milliseconds
 * @returns Formatted duration (e.g., "2h 30m", "45s")
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Capitalize first letter of a string
 * @param text - Text to capitalize
 * @returns Capitalized text
 */
export function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Convert text to title case
 * @param text - Text to convert
 * @returns Title cased text
 */
export function titleCase(text: string): string {
  return text
    .toLowerCase()
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}

/**
 * Pluralize a word based on count
 * @param count - Number to check
 * @param singular - Singular form
 * @param plural - Plural form (default: singular + "s")
 * @returns Pluralized word
 */
export function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : plural || `${singular}s`;
}
