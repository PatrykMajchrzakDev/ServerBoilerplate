import { User } from "@prisma/client";

// Remove unwanted properties from user object
export const stripUserToFrontend = (user: User) => {
  const { password: _, ...strippedUser } = user;
  return strippedUser;
};
