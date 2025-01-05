// Purpose of this file it to provide human-readable error feedback as JSON

import { HTTPSTATUS } from "@/config/http.config";
import { AppError } from "@/utils/AppError";
import { REFRESH_PATH, clearAuthenticationCookies } from "@/utils/cookie";
import { ErrorRequestHandler, Response } from "express";
import { z } from "zod";

// Function formats zod error to human-readble error
const formatZodError = (res: Response, error: z.ZodError) => {
  const errors = error?.issues?.map((err) => ({
    field: err.path.join("."),
    message: err.message,
  }));

  return res.status(HTTPSTATUS.BAD_REQUEST).json({
    message: "Validation failed",
    errors: errors,
  });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next
): any => {
  console.error(`Error occured on PATH: ${req.path}`, error);

  // Remove cookies if request path matches refresh cookie path
  if (req.path === REFRESH_PATH) {
    clearAuthenticationCookies(res);
  }

  // Returns bad body format msg as response
  if (error instanceof SyntaxError) {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      message: "Invalid JSON format. Please check your request body",
    });
  }

  // Returns error for incorrect JSON file which client sends
  if (error instanceof z.ZodError) {
    return formatZodError(res, error);
  }

  // Returns app error if matches AppError instance
  if (error instanceof AppError) {
    // most common status codes are asigned in @/config/http.config.ts
    return res.status(error.statusCode).json({
      message: error.message,
      errorCode: error.errorCode,
    });
  }

  // Returns internal server error msg as response with error if exists
  return res.status(HTTPSTATUS.INTERNAL_SERVER_ERROR).json({
    message: "Internal server error",
    error: error?.message || "Unknown error occured",
  });
};
