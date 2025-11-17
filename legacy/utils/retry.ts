import type { RetryStrategy } from '../types/index.js';

/**
 * Sleep utility with jitter support
 */
export async function sleep(ms: number, jitterMs: number = 0): Promise<void> {
  const jitter = jitterMs > 0 ? Math.random() * jitterMs : 0;
  await new Promise((resolve) => globalThis.setTimeout(resolve, ms + jitter));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  strategy: RetryStrategy,
  shouldRetry: (error: unknown) => boolean = () => true
): Promise<T> {
  let lastError: unknown;
  let delay = strategy.delayMs;

  for (let attempt = 1; attempt <= strategy.attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === strategy.attempts || !shouldRetry(error)) {
        throw error;
      }

      await sleep(delay, strategy.jitterMs);
      delay *= strategy.backoffFactor;
    }
  }

  throw lastError;
}

/**
 * Rate limiter using token bucket algorithm
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly maxTokens: number,
    private readonly refillRateMs: number
  ) {
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Wait until we have tokens
    const waitMs = this.refillRateMs * (1 - this.tokens);
    await sleep(waitMs);
    this.tokens = 0;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = elapsed / this.refillRateMs;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }
}
