// Custom error class for application-specific errors
// Extends the built-in Error class to include HTTP status codes and optional error codes

import { HTTPSTATUS, HttpStatusCode } from "@/config/http.config";
import { errorCode } from "@/common/enums/errorCodeEnum";

export class AppError extends Error {
  public statusCode: HttpStatusCode;
  // Optional application-specific error code
  public errorCode?: errorCode;

  constructor(
    // Default to 500 if no status code is provided
    statusCode = HTTPSTATUS.INTERNAL_SERVER_ERROR,

    message: string,
    errorCode?: errorCode
  ) {
    // Call the base Error constructor with the provided message
    super(message);

    // Asigns codes
    this.statusCode = statusCode;
    this.errorCode = errorCode;

    // Capture the stack trace for this error instance, excluding the constructor itself
    Error.captureStackTrace(this, this.constructor);
  }
}
