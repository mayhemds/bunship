/**
 * Global error handler plugin
 */
import { Elysia } from "elysia";
import { AppError } from "@bunship/utils";

export const errorHandler = new Elysia({ name: "errorHandler" }).onError(
  { as: "global" },
  ({ code, error, set }) => {
    // Handle Elysia parse errors (malformed JSON, wrong content-type)
    if (code === "PARSE") {
      set.status = 400;
      return {
        success: false,
        error: {
          code: "PARSE_ERROR",
          message: "Invalid request body",
        },
      };
    }

    // Handle Elysia validation errors
    if (code === "VALIDATION") {
      set.status = 400;
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: error.message,
        },
      };
    }

    // Handle not found
    if (code === "NOT_FOUND") {
      set.status = 404;
      return {
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Resource not found",
        },
      };
    }

    // Handle our custom AppError
    if (error instanceof AppError) {
      set.status = error.statusCode;
      return {
        success: false,
        error: {
          code: error.code ?? "ERROR",
          message: error.message,
        },
      };
    }

    // Handle unknown errors
    console.error("Unhandled error:", error);
    set.status = 500;
    return {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message:
          process.env.NODE_ENV === "development"
            ? error instanceof Error
              ? error.message
              : "Unknown error"
            : "An unexpected error occurred",
      },
    };
  }
);
