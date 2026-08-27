import { describe, it, expect } from "bun:test";
import { hashPassword, verifyPassword } from "../src/lib/password";
import {
  generateRefreshToken,
  hashRefreshToken,
  ttlToSeconds,
  refreshExpiryDate,
} from "../src/lib/tokens";

describe("password hashing (argon2id)", () => {
  it("gera hash argon2id e verifica corretamente", async () => {
    const hash = await hashPassword("senhaForte123");
    expect(hash).toStartWith("$argon2id$");
    expect(await verifyPassword("senhaForte123", hash)).toBe(true);
  });

  it("rejeita senha errada", async () => {
    const hash = await hashPassword("senhaForte123");
    expect(await verifyPassword("errada", hash)).toBe(false);
  });

  it("nao explode com hash invalido", async () => {
    expect(await verifyPassword("qualquer", "lixo")).toBe(false);
  });
});

describe("refresh tokens", () => {
  it("gera tokens unicos e opacos", () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThan(40);
  });

  it("hash e deterministico pro mesmo token", () => {
    const token = generateRefreshToken();
    expect(hashRefreshToken(token)).toBe(hashRefreshToken(token));
    expect(hashRefreshToken(token)).not.toBe(token);
  });

  it("data de expiracao no futuro", () => {
    expect(refreshExpiryDate(30).getTime()).toBeGreaterThan(Date.now());
  });
});

describe("ttlToSeconds", () => {
  it("converte unidades", () => {
    expect(ttlToSeconds("15m")).toBe(900);
    expect(ttlToSeconds("1h")).toBe(3600);
    expect(ttlToSeconds("30s")).toBe(30);
    expect(ttlToSeconds("900")).toBe(900);
  });
  it("cai no default com entrada invalida", () => {
    expect(ttlToSeconds("xyz")).toBe(900);
  });
});
