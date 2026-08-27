import { randomBytes, createHash } from "node:crypto";

// Refresh token: valor opaco aleatorio entregue ao cliente, guardado no banco
// apenas como hash SHA-256. Rotativo — cada refresh gera um novo e revoga o antigo.

export function generateRefreshToken(): string {
  return randomBytes(48).toString("base64url");
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function refreshExpiryDate(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

// TTL do access token -> segundos, aceitando "15m", "900s", "1h" ou numero puro.
export function ttlToSeconds(ttl: string): number {
  const match = /^(\d+)\s*(s|m|h|d)?$/.exec(ttl.trim());
  if (!match) return 900;
  const value = Number(match[1]);
  const unit = match[2] ?? "s";
  const mult = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return value * mult;
}
