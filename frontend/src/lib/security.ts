/**
 * Security utilities for input validation and sanitization
 */

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param html - HTML string to sanitize
 * @returns Sanitized HTML string
 */
export function sanitizeHtml(html: string): string {
  const div = document.createElement("div");
  div.textContent = html;
  return div.innerHTML;
}

/**
 * Validates and sanitizes user input
 * @param input - User input string
 * @param maxLength - Maximum allowed length (default: 1000)
 * @returns Sanitized input or null if invalid
 */
export function sanitizeInput(
  input: string,
  maxLength: number = 1000
): string | null {
  if (typeof input !== "string") {
    return null;
  }

  // Remove null bytes and control characters (intentional: strip control chars)
  // eslint-disable-next-line no-control-regex -- intentional match for sanitization
  let sanitized = input.replace(/[\x00-\x1F\x7F]/g, "");

  // Trim whitespace
  sanitized = sanitized.trim();

  // Check length
  if (sanitized.length > maxLength) {
    return null;
  }

  // Remove potentially dangerous characters
  sanitized = sanitized.replace(/[<>]/g, "");

  return sanitized;
}

/**
 * Validates URL to prevent open redirect attacks
 * @param url - URL to validate
 * @param allowedDomains - Array of allowed domains (default: current origin)
 * @returns True if URL is safe
 */
export function isValidUrl(
  url: string,
  allowedDomains: string[] = []
): boolean {
  try {
    const urlObj = new URL(url, window.location.origin);
    const origin = urlObj.origin;

    // If no allowed domains specified, only allow same origin
    if (allowedDomains.length === 0) {
      return origin === window.location.origin;
    }

    // Check if URL is from allowed domain
    return allowedDomains.some((domain) => origin.includes(domain));
  } catch {
    return false;
  }
}

/**
 * Validates email format (basic validation)
 * @param email - Email address to validate
 * @returns True if email format is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generates a secure random token
 * @param length - Token length in bytes (default: 32)
 * @returns Base64-encoded random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

/**
 * Validates CSRF token format
 * @param token - CSRF token to validate
 * @returns True if token format is valid
 */
export function isValidCsrfToken(token: string): boolean {
  // CSRF tokens should be non-empty strings
  return typeof token === "string" && token.length > 0 && token.length <= 256;
}

/**
 * Escapes special characters in a string for use in HTML
 * @param text - Text to escape
 * @returns Escaped HTML string
 */
export function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m] ?? m);
}

/**
 * Validates that a value is within safe numeric range
 * @param value - Value to validate
 * @param min - Minimum value (default: Number.MIN_SAFE_INTEGER)
 * @param max - Maximum value (default: Number.MAX_SAFE_INTEGER)
 * @returns True if value is within range
 */
export function isValidNumber(
  value: unknown,
  min: number = Number.MIN_SAFE_INTEGER,
  max: number = Number.MAX_SAFE_INTEGER
): boolean {
  if (typeof value !== "number" || isNaN(value) || !isFinite(value)) {
    return false;
  }
  return value >= min && value <= max;
}


