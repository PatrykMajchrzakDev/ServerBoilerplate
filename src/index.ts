// Server modules
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import { config } from "@/config/app.config";
import { errorHandler } from "@/middleware/errorHandler";
import { HTTPSTATUS } from "@/config/http.config";
import { asyncHandler } from "@/middleware/asyncHandler";
import { BadRequestException } from "./utils/CatchError";
import { ErrorCode } from "./common/enums/errorCodeEnum";
import authRoutes from "./modules/auth/auth.routes";
import passport from "./middleware/passport";
import { authenticateJWT } from "./common/strategies/jwt.strategy";
import sessionRoutes from "./modules/session/session.routes";

const app = express();

// <!-- ======================== -->
// <!-- ====== Middleware ====== -->
// <!-- ======================== -->

//Cookies
app.use(cookieParser());

// Initialize passport and session
app.use(passport.initialize());

// Automatically convert the body of any request to server as JSON
app.use(express.json());

// Cors to handle cross domain resource sharing
app.use(
  cors({
    // credentials prop handles sending cookie credentials to client
    credentials: true,
    origin: config.BACKEND_BASE_URL,
  })
);
//Middleware that parses info sent to backend and changes it to human readable format
app.use(express.urlencoded({ extended: true }));

// <!-- ======================== -->
// <!-- ======== ROUTING ======= -->
// <!-- ======================== -->
// BASE_PATH = /api/v1
const BASE_PATH = config.BASE_PATH;

app.use(`${BASE_PATH}/auth`, authRoutes);

app.use(`${BASE_PATH}/session`, authenticateJWT, sessionRoutes);

// TEST routes
app.get(
  "/test",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // throw new BadRequestException("Bad request", ErrorCode.ACCESS_FORBIDDEN);
    res.status(HTTPSTATUS.OK).json({
      message: "Hello",
    });
  })
);

//Server error handler - provides nice JSON - has to at the bottom!!!
app.use(errorHandler);

// <!-- ======================== -->
// <!-- ===== SERVER START ===== -->
// <!-- ======================== -->
app.listen(config.PORT || 4000, () => {
  console.log(`Server started port:${config.PORT} in ${config.NODE_ENV}`);
});
