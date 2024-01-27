export const ProviderEnum = {
  GOOGLE: "GOOGLE",
  GITHUB: "GITHUB",
  FACEBOOK: "FACEBOOK",
  EMAIL: "EMAIL",
  APPLE: "APPLE",
};

export type ProviderEnumType = keyof typeof ProviderEnum;
