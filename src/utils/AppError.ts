// Custom error class for application-specific errors
// Extends the built-in Error class to include HTTP status codes and optional error codes

import { HTTPSTATUS, HttpStatusCode } from "@/config/http.config";
import { ErrorCode } from "@/common/enums/errorCodeEnum";

export class AppError extends Error {
  public statusCode: HttpStatusCode;
  // Optional application-specific error code
  public errorCode?: ErrorCode;

  constructor(
    message: string,
    statusCode = HTTPSTATUS.INTERNAL_SERVER_ERROR, // Default to 500 if no status code is provided
    errorCode?: ErrorCode
  ) {
    super(message); // Call the base Error constructor with the provided message

    // Asigns codes
    this.statusCode = statusCode;
    this.errorCode = errorCode;

    // Capture the stack trace for this error instance, excluding the constructor itself
    Error.captureStackTrace(this, this.constructor);
  }
}
