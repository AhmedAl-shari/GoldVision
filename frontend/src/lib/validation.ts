/**
 * Shared validation utilities
 */

/**
 * Validates email format and ensures it's a Gmail address
 */
export function validateGmailEmail(email: string): {
  isValid: boolean;
  error?: string;
} {
  if (!email) {
    return { isValid: false, error: "Email is required." };
  }

  // Basic email format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: "Please enter a valid email address." };
  }

  // Only allow @gmail.com emails
  const emailParts = email.toLowerCase().split("@");
  if (emailParts.length !== 2 || emailParts[1] !== "gmail.com") {
    return {
      isValid: false,
      error: "Only Gmail accounts (@gmail.com) are allowed.",
    };
  }

  return { isValid: true };
}

/**
 * Validates password strength
 */
export function validatePassword(password: string): {
  isValid: boolean;
  error?: string;
  strength?: number;
} {
  if (!password) {
    return { isValid: false, error: "Password is required." };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: "Password must be at least 8 characters long.",
    };
  }

  // Calculate strength (0-4)
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z\d]/.test(password)) strength++;

  return { isValid: true, strength };
}

