export class MwError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: unknown;

  constructor(code: string, message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "MwError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function fail(code: string, message: string, status = 400, details?: unknown): never {
  throw new MwError(code, message, status, details);
}
