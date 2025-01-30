// Server modules
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import cookieParser from "cookie-parser";
import session from "express-session";
import { config } from "@/config/app.config";
import { errorHandler } from "@/middleware/errorHandler";
import { HTTPSTATUS } from "@/config/http.config";
import { asyncHandler } from "@/middleware/asyncHandler";
import authRoutes from "./modules/auth/auth.routes";
import passport from "./middleware/passport";
import { authenticateJWT } from "./common/strategies/jwt.strategy";
import sessionRoutes from "./modules/session/session.routes";
import mfaRoutes from "./modules/mfa/mfa.routes";

const app = express();

// <!-- ======================== -->
// <!-- ====== Middleware ====== -->
// <!-- ======================== -->

//Cookies
app.use(cookieParser());

app.use(
  session({
    resave: true,
    saveUninitialized: true,
    secret: config.SESSION_SECRET,
    name: "sessCookie", // change the cookie name for additional security in production
    cookie: {
      maxAge: 1209600000, // Two weeks in milliseconds
      secure: config.NODE_ENV === "production",
    },
  })
);

// Initialize passport and session
app.use(passport.initialize());
app.use(passport.session());

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
// BACKEND_API_PATH = /api/v1
const BACKEND_API_PATH = config.BACKEND_API_PATH;

app.use(`${BACKEND_API_PATH}/auth`, authRoutes);
app.use(`${BACKEND_API_PATH}/session`, authenticateJWT, sessionRoutes);
app.use(`${BACKEND_API_PATH}/mfa`, mfaRoutes);

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
