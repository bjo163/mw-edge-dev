export class MwError extends Error {
  constructor(code, message, status = 400, details) {
    super(message);
    this.name = "MwError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}
export const fail = (code, message, status = 400, details) => { throw new MwError(code, message, status, details); };
