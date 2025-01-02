// Purpose of this file it to provide human-readable error feedback as JSON

import { HTTPSTATUS } from "@/config/http.config";
import { AppError } from "@/utils/AppError";
import { ErrorRequestHandler } from "express";

export const errorHandler: ErrorRequestHandler = (
  error,
  req,
  res,
  next
): any => {
  console.error(`Error occured on PATH: ${req.path}`, error);

  // Returns bad body format msg as response
  if (error instanceof SyntaxError) {
    return res.status(HTTPSTATUS.BAD_REQUEST).json({
      message: "Invalid JSON format. Please check your request body",
    });
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
