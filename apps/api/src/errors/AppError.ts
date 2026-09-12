export interface ErrorDetail {
  field?: string;
  message: string;
}

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details: ErrorDetail[];

  constructor(
    statusCode: number,
    code: string,
    message: string,
    details: ErrorDetail[] = [],
  ) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }

  static badRequest(message = "Bad request", details: ErrorDetail[] = []): AppError {
    return new AppError(400, "BAD_REQUEST", message, details);
  }

  static validation(message = "Invalid request data", details: ErrorDetail[] = []): AppError {
    return new AppError(400, "VALIDATION_ERROR", message, details);
  }

  static unauthorized(message = "Authentication required", details: ErrorDetail[] = []): AppError {
    return new AppError(401, "UNAUTHORIZED", message, details);
  }

  static forbidden(message = "You are not permitted to access this resource", details: ErrorDetail[] = []): AppError {
    return new AppError(403, "FORBIDDEN", message, details);
  }

  static notFound(message = "Resource not found", details: ErrorDetail[] = []): AppError {
    return new AppError(404, "NOT_FOUND", message, details);
  }

  static conflict(message = "Resource already exists", details: ErrorDetail[] = []): AppError {
    return new AppError(409, "CONFLICT", message, details);
  }

  static internal(message = "Internal server error", details: ErrorDetail[] = []): AppError {
    return new AppError(500, "INTERNAL_SERVER_ERROR", message, details);
  }
}
