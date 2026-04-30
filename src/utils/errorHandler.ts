import { Request, Response, NextFunction } from "express";
import { MongoError } from "mongodb";
import { SuccessResponse, ErrorResponse } from "../types/index.js";

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      fn(req, res, next).catch(next);
    } catch (error) {
      next(error);
    }
  };
}

export function createSuccessResponse<T>(
  data: T,
  message?: string,
): SuccessResponse<T> {
  return {
    success: true,
    message: message ?? "Operation completed successfully",
    data,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse(
  message: string,
  code?: string,
  details?: unknown,
): ErrorResponse {
  return {
    success: false,
    message,
    error: { message, code, details },
    timestamp: new Date().toISOString(),
  };
}

function parseErrorDetails(err: Error): {
  message: string;
  code: string;
  details?: unknown;
  statusCode: number;
} {
  if (err instanceof MongoError) {
    switch (err.code) {
      case 11000:
        return {
          message: "Duplicate key error",
          code: "DUPLICATE_KEY",
          details: "A document with this data already exists",
          statusCode: 409,
        };
      case 121:
        return {
          message: "Document validation failed",
          code: "DOCUMENT_VALIDATION_ERROR",
          details: err.message,
          statusCode: 400,
        };
      default:
        return {
          message: "Database error",
          code: "DATABASE_ERROR",
          details: err.code,
          statusCode: 500,
        };
    }
  }

  if (err.name === "ValidationError") {
    return {
      message: "Validation failed",
      code: "VALIDATION_ERROR",
      details: err.message,
      statusCode: 400,
    };
  }

  return {
    message: err.message || "Internal server error",
    code: "INTERNAL_ERROR",
    statusCode: 500,
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error(`[error] ${req.method} ${req.url}:`, err.message);
  const details = parseErrorDetails(err);
  res
    .status(details.statusCode)
    .json(createErrorResponse(details.message, details.code, details.details));
}
