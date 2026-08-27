// Config lida do ambiente uma vez. Falha cedo se faltar o essencial.

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 3333),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  accessTokenTtl: process.env.ACCESS_TOKEN_TTL ?? "15m",
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS ?? 30),
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:8081")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  isProd: (process.env.NODE_ENV ?? "development") === "production",
};

export type Env = typeof env;
