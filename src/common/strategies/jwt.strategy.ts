import { UnauthorizedException } from "@/utils/CatchError";
import {
  ExtractJwt,
  Strategy as JwtStrategy,
  StrategyOptionsWithRequest,
} from "passport-jwt";
import { ErrorCode } from "../enums/errorCodeEnum";
import { config } from "@/config/app.config";
import passport, { PassportStatic } from "passport";
import { userService } from "@/modules/user/user.module";

// Defining the structure for JWT payload received from token
interface JwtPayload {
  userId: string;
  sessionId: string;
}

// Options configuration for the JWT strategy
const options: StrategyOptionsWithRequest = {
  jwtFromRequest: ExtractJwt.fromExtractors([
    (req) => {
      // Extracting JWT from the request cookies
      const accessToken = req.cookies.accessToken;

      // Throw an error if token is not found
      if (!accessToken) {
        throw new UnauthorizedException(
          "Unauthorized access token",
          ErrorCode.AUTH_TOKEN_NOT_FOUND
        );
      }

      return accessToken;
    },
  ]),
  secretOrKey: config.JWT_SECRET,
  // Defining the expected audience and algorithm for security
  audience: ["user"],
  algorithms: ["HS256"],
  // Allowing the request object to be passed to the callback
  passReqToCallback: true,
};

// Function to setup the JWT strategy with passport
export const setupJwtStrategy = (passport: PassportStatic) => {
  passport.use(
    new JwtStrategy(options, async (req, payload: JwtPayload, done) => {
      try {
        // Fetching user from the database using the payload's userId
        const user = await userService.findUserById(payload.userId);

        if (!user) {
          // If no user is found, deny authentication
          return done(null, false);
        }

        // Attach the sessionId from payload to the request for later use
        req.sessionId = payload.sessionId;
        // Successfully authenticated
        return done(null, user);
      } catch (error) {
        // Handle any errors occurring during the process
        return done(error, false);
      }
    })
  );
};

// Middleware to authenticate requests using JWT strategy without sessions
export const authnticateJWT = passport.authenticate("jwt", { session: false });
