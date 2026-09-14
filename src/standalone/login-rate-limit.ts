import { sha256 } from "../kernel/util.js";

export interface LoginRateLimitOptions {
  readonly maxFailures?: number;
  readonly windowMs?: number;
  readonly maxKeys?: number;
}

interface FailureWindow {
  failures: number;
  resetAt: number;
}

function positiveInteger(name: string, value: number, maximum: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximum) {
    throw new Error(`${name} must be an integer between 1 and ${maximum}`);
  }
  return value;
}

export function loginRateLimitKey(username: string): string {
  return sha256(username.trim().toLowerCase());
}

export class LoginRateLimiter {
  readonly #windows = new Map<string, FailureWindow>();
  readonly maxFailures: number;
  readonly windowMs: number;
  readonly maxKeys: number;

  constructor(options: LoginRateLimitOptions = {}) {
    this.maxFailures = positiveInteger("maxFailures", options.maxFailures ?? 5, 100);
    this.windowMs = positiveInteger("windowMs", options.windowMs ?? 60_000, 60 * 60 * 1000);
    this.maxKeys = positiveInteger("maxKeys", options.maxKeys ?? 5000, 100_000);
  }

  retryAfterMs(key: string, now = Date.now()): number {
    const current = this.#windows.get(key);
    if (!current) return 0;
    if (current.resetAt <= now) {
      this.#windows.delete(key);
      return 0;
    }
    return current.failures >= this.maxFailures ? current.resetAt - now : 0;
  }

  recordFailure(key: string, now = Date.now()): number {
    let current = this.#windows.get(key);
    if (!current || current.resetAt <= now) {
      if (!current && this.#windows.size >= this.maxKeys) {
        const oldest = this.#windows.keys().next().value as string | undefined;
        if (oldest) this.#windows.delete(oldest);
      }
      current = { failures: 0, resetAt: now + this.windowMs };
      this.#windows.set(key, current);
    }
    current.failures += 1;
    return current.failures >= this.maxFailures ? current.resetAt - now : 0;
  }

  reset(key: string): void {
    this.#windows.delete(key);
  }
}
