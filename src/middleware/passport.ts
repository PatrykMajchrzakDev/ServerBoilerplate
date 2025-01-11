import { setupJwtStrategy } from "@/common/strategies/jwt.strategy";
import passport from "passport";

const initializePassport = () => {
  setupJwtStrategy(passport);
};

initializePassport();

export default passport;
