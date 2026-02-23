/**
 * RFC 7807 Problem Details for HTTP APIs Error Response Utility
 * Standardizes error responses across the application
 */

/**
 * Creates a standardized error response following RFC 7807
 * @param {Object} options - Error configuration
 * @param {string} options.type - URI identifying the problem type
 * @param {string} options.title - Short, human-readable summary
 * @param {number} options.status - HTTP status code
 * @param {string} options.detail - Human-readable explanation
 * @param {string} options.instance - URI reference identifying the specific occurrence
 * @param {string} options.requestId - Unique request identifier
 * @param {Object} options.errors - Additional error details
 * @returns {Object} Standardized error response
 */
function createErrorResponse({
  type = "about:blank",
  title,
  status,
  detail,
  instance,
  requestId,
  errors = null,
}) {
  const response = {
    type,
    title,
    status,
    detail,
    instance: instance || "/unknown",
  };

  if (requestId) {
    response.request_id = requestId;
  }

  if (errors) {
    response.errors = errors;
  }

  return response;
}

/**
 * Maps HTTP status codes to standard error types and titles
 */
const STATUS_MAPPINGS = {
  400: {
    type: "https://tools.ietf.org/html/rfc7231#section-6.5.1",
    title: "Bad Request",
  },
  401: {
    type: "https://tools.ietf.org/html/rfc7235#section-3.1",
    title: "Unauthorized",
  },
  403: {
    type: "https://tools.ietf.org/html/rfc7231#section-6.5.3",
    title: "Forbidden",
  },
  404: {
    type: "https://tools.ietf.org/html/rfc7231#section-6.5.4",
    title: "Not Found",
  },
  409: {
    type: "https://tools.ietf.org/html/rfc7231#section-6.5.8",
    title: "Conflict",
  },
  422: {
    type: "https://tools.ietf.org/html/rfc4918#section-11.2",
    title: "Unprocessable Entity",
  },
  429: {
    type: "https://tools.ietf.org/html/rfc6585#section-4",
    title: "Too Many Requests",
  },
  500: {
    type: "https://tools.ietf.org/html/rfc7231#section-6.6.1",
    title: "Internal Server Error",
  },
  502: {
    type: "https://tools.ietf.org/html/rfc7231#section-6.6.3",
    title: "Bad Gateway",
  },
  503: {
    type: "https://tools.ietf.org/html/rfc7231#section-6.6.4",
    title: "Service Unavailable",
  },
};

/**
 * Creates a standardized error response for common HTTP status codes
 * @param {number} statusCode - HTTP status code
 * @param {string} detail - Error detail message
 * @param {string} instance - Request instance path
 * @param {string} requestId - Request ID
 * @param {Object} errors - Additional error details
 * @returns {Object} Standardized error response
 */
function createStandardError(
  statusCode,
  detail,
  instance,
  requestId,
  errors = null
) {
  const mapping = STATUS_MAPPINGS[statusCode] || STATUS_MAPPINGS[500];

  return createErrorResponse({
    type: mapping.type,
    title: mapping.title,
    status: statusCode,
    detail,
    instance,
    requestId,
    errors,
  });
}

/**
 * Creates validation error response for OpenAPI validation errors
 * @param {Array} validationErrors - Array of validation errors
 * @param {string} instance - Request instance path
 * @param {string} requestId - Request ID
 * @returns {Object} Standardized validation error response
 */
function createValidationError(validationErrors, instance, requestId) {
  const errors = validationErrors.map((error) => ({
    code: error.errorCode || "VALIDATION_ERROR",
    message: error.message,
    path: error.path,
    value: error.value,
  }));

  return createErrorResponse({
    type: "https://tools.ietf.org/html/rfc4918#section-11.2",
    title: "Validation Error",
    status: 422,
    detail: "Request validation failed",
    instance,
    requestId,
    errors,
  });
}

/**
 * Creates rate limit error response
 * @param {string} detail - Rate limit message
 * @param {number} retryAfter - Seconds to wait before retrying
 * @param {string} instance - Request instance path
 * @param {string} requestId - Request ID
 * @returns {Object} Standardized rate limit error response
 */
function createRateLimitError(detail, retryAfter, instance, requestId) {
  const response = createStandardError(429, detail, instance, requestId);
  response.retry_after = retryAfter;
  return response;
}

/**
 * Creates authentication error response
 * @param {string} detail - Authentication error message
 * @param {string} instance - Request instance path
 * @param {string} requestId - Request ID
 * @returns {Object} Standardized authentication error response
 */
function createAuthError(detail, instance, requestId) {
  return createStandardError(401, detail, instance, requestId);
}

/**
 * Creates authorization error response
 * @param {string} detail - Authorization error message
 * @param {string} instance - Request instance path
 * @param {string} requestId - Request ID
 * @returns {Object} Standardized authorization error response
 */
function createAuthorizationError(detail, instance, requestId) {
  return createStandardError(403, detail, instance, requestId);
}

/**
 * Creates not found error response
 * @param {string} detail - Not found error message
 * @param {string} instance - Request instance path
 * @param {string} requestId - Request ID
 * @returns {Object} Standardized not found error response
 */
function createNotFoundError(detail, instance, requestId) {
  return createStandardError(404, detail, instance, requestId);
}

/**
 * Creates internal server error response
 * @param {string} detail - Internal error message
 * @param {string} instance - Request instance path
 * @param {string} requestId - Request ID
 * @returns {Object} Standardized internal error response
 */
function createInternalError(detail, instance, requestId) {
  return createStandardError(500, detail, instance, requestId);
}

module.exports = {
  createErrorResponse,
  createStandardError,
  createValidationError,
  createRateLimitError,
  createAuthError,
  createAuthorizationError,
  createNotFoundError,
  createInternalError,
  STATUS_MAPPINGS,
};
