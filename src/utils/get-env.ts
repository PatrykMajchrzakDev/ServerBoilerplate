//Purpose of this file is to serve env variable and throw error if used env variable does not exist

export const getEnv = (key: string, defaultValue: string = ""): string => {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue) {
      return defaultValue;
    }
    throw new Error(`Enviroment variable ${key} is not set `);
  }
  return value;
};
