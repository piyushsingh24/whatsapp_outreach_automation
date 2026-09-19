export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "EXTERNAL_SERVICE_ERROR"
  | "INTERNAL_SERVER_ERROR";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  EXTERNAL_SERVICE_ERROR: 502,
  INTERNAL_SERVER_ERROR: 500,
};

export class AppError extends Error {
  code: ErrorCode;
  status: number;
  details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
    this.details = details;
  }
}

export function toErrorResponse(err: unknown) {
  if (err instanceof AppError) {
    return Response.json(
      { error: { code: err.code, message: err.message, details: err.details ?? null } },
      { status: err.status }
    );
  }
  if (err instanceof Error && (err as { status?: number }).status) {
    const status = (err as { status?: number }).status ?? 500;
    return Response.json(
      { error: { code: "INTERNAL_SERVER_ERROR", message: err.message } },
      { status }
    );
  }
  console.error("[unhandled]", err);
  return Response.json(
    { error: { code: "INTERNAL_SERVER_ERROR", message: "Something went wrong" } },
    { status: 500 }
  );
}

export const Errors = {
  validation: (message: string, details?: unknown) =>
    new AppError("VALIDATION_ERROR", message, details),
  unauthorized: (message = "Unauthorized") => new AppError("UNAUTHORIZED", message),
  forbidden: (message = "Forbidden") => new AppError("FORBIDDEN", message),
  notFound: (resource = "Resource") => new AppError("NOT_FOUND", `${resource} not found`),
  conflict: (message: string, details?: unknown) => new AppError("CONFLICT", message, details),
  rateLimited: (message = "Rate limited") => new AppError("RATE_LIMITED", message),
  external: (message: string, details?: unknown) =>
    new AppError("EXTERNAL_SERVICE_ERROR", message, details),
  internal: (message = "Internal server error") =>
    new AppError("INTERNAL_SERVER_ERROR", message),
};
