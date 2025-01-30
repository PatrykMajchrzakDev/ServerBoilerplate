import { ProviderEnum } from "@/common/enums/accountProviderEnum";
import { setupJwtStrategy } from "@/common/strategies/jwt.strategy";
import { config } from "@/config/app.config";
import { authService } from "@/modules/auth/auth.module";
import { NotFoundException } from "@/utils/CatchError";
import { Request } from "express";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";

const initializePassport = () => {
  setupJwtStrategy(passport);
};

initializePassport();

// ================== GOOGLE OAUTH ==================
passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
      passReqToCallback: true,
    },
    async (
      req: Request,
      accessToken: any,
      refreshToken: any,
      profile: any,
      done: any
    ) => {
      const { email, sub: googleId } = profile._json;

      if (!googleId) {
        throw new NotFoundException("Google ID (sub) is missing");
      }

      // Find or create user in PostgreSQL
      const { user } = await authService.loginOrCreateAccountService({
        provider: ProviderEnum.GOOGLE,
        displayName: profile.displayName,
        providerId: googleId,
        email: email,
      });

      done(null, user); // Attach user to req.user
    }
  )
);

passport.serializeUser((user: any, done) => done(null, user));
passport.deserializeUser((user: any, done) => done(null, user));

export default passport;
