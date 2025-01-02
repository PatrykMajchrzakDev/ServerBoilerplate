// Server modules
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import "dotenv/config";
import passport from "passport";
import cookieParser from "cookie-parser";
import { config } from "@/config/app.config";
import { errorHandler } from "@/middleware/errorHandler";
import { HTTPSTATUS } from "@/config/http.config";
import { asyncHandler } from "@/middleware/asyncHandler";

const app = express();

// <!-- ======================== -->
// <!-- ====== Middleware ====== -->
// <!-- ======================== -->

//Cookies
app.use(cookieParser());

// Initialize passport and session
// app.use(passport.initialize());
// app.use(passport.session());

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

//

// TEST routes
app.get(
  "/test",
  asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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
