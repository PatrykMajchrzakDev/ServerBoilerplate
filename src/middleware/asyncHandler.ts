// Purpose of this file is to provide nice error feedback for async requests. Nice error format feedback is created via @/middleware/errorHandler.ts

import { NextFunction, Request, Response } from "express";

type AsynControllerType = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const asyncHandler =
  (controller: AsynControllerType): AsynControllerType =>
  async (req, res, next) => {
    try {
      await controller(req, res, next);
    } catch (error) {
      next(error);
    }
  };
