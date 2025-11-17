/**
 * Base error class for Perplexity exporter operations
 */
export class PerplexityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly retriable: boolean = false,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'PerplexityError';
    Object.setPrototypeOf(this, PerplexityError.prototype);
  }
}

/**
 * Network or HTTP-related errors
 */
export class NetworkError extends PerplexityError {
  constructor(
    message: string,
    public readonly statusCode?: number,
    cause?: unknown
  ) {
    super(
      message,
      'NETWORK_ERROR',
      statusCode ? statusCode >= 500 || statusCode === 429 : true,
      cause
    );
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

/**
 * API response validation errors
 */
export class ValidationError extends PerplexityError {
  constructor(message: string, cause?: unknown) {
    super(message, 'VALIDATION_ERROR', false, cause);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Authentication/authorization errors
 */
export class AuthenticationError extends PerplexityError {
  constructor(message: string, cause?: unknown) {
    super(message, 'AUTH_ERROR', false, cause);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Rate limiting errors
 */
export class RateLimitError extends PerplexityError {
  constructor(
    message: string,
    public readonly retryAfterMs?: number,
    cause?: unknown
  ) {
    super(message, 'RATE_LIMIT_ERROR', true, cause);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Cloudflare challenge or bot detection errors
 */
export class CloudflareError extends PerplexityError {
  constructor(message: string, cause?: unknown) {
    super(message, 'CLOUDFLARE_ERROR', false, cause);
    this.name = 'CloudflareError';
    Object.setPrototypeOf(this, CloudflareError.prototype);
  }
}

/**
 * Timeout errors
 */
export class TimeoutError extends PerplexityError {
  constructor(message: string, cause?: unknown) {
    super(message, 'TIMEOUT_ERROR', true, cause);
    this.name = 'TimeoutError';
    Object.setPrototypeOf(this, TimeoutError.prototype);
  }
}
