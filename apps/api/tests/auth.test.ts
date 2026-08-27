import { describe, it, expect, beforeEach } from "bun:test";
import { req, resetDb, registerUser } from "./helpers";

describe("auth flow", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("registra e retorna tokens + user publico (sem hash)", async () => {
    const { status, body } = await req("/auth/register", {
      method: "POST",
      body: { email: "novo@teste.com", password: "senhaForte123", name: "Novo", goal: "cut" },
    });
    expect(status).toBe(201);
    expect(body.accessToken).toBeString();
    expect(body.refreshToken).toBeString();
    expect(body.user.email).toBe("novo@teste.com");
    expect(body.user.goal).toBe("cut");
    expect(body.user).not.toHaveProperty("passwordHash");
  });

  it("nao deixa registrar email duplicado", async () => {
    await registerUser("dup@teste.com");
    const { status, body } = await req("/auth/register", {
      method: "POST",
      body: { email: "dup@teste.com", password: "senhaForte123", name: "Dup" },
    });
    expect(status).toBe(409);
    expect(body.error.code).toBe("EMAIL_TAKEN");
  });

  it("login com credencial certa devolve tokens", async () => {
    await registerUser("login@teste.com");
    const { status, body } = await req("/auth/login", {
      method: "POST",
      body: { email: "login@teste.com", password: "senhaForte123" },
    });
    expect(status).toBe(200);
    expect(body.accessToken).toBeString();
  });

  it("login errado nao revela se o email existe", async () => {
    await registerUser("existe@teste.com");
    const errado = await req("/auth/login", {
      method: "POST",
      body: { email: "existe@teste.com", password: "senhaErrada" },
    });
    const inexistente = await req("/auth/login", {
      method: "POST",
      body: { email: "naoexiste@teste.com", password: "qualquer" },
    });
    expect(errado.status).toBe(401);
    expect(inexistente.status).toBe(401);
    // Mesma mensagem generica pros dois casos.
    expect(errado.body.error.message).toBe(inexistente.body.error.message);
    expect(errado.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  it("GET /auth/me exige token", async () => {
    const semToken = await req("/auth/me");
    expect(semToken.status).toBe(401);

    const { accessToken, user } = await registerUser("me@teste.com");
    const comToken = await req("/auth/me", { token: accessToken });
    expect(comToken.status).toBe(200);
    expect(comToken.body.user.id).toBe(user.id);
  });

  it("refresh rotaciona: token antigo para de funcionar", async () => {
    const { refreshToken } = await registerUser("rot@teste.com");
    const first = await req("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
    expect(first.status).toBe(200);
    expect(first.body.refreshToken).not.toBe(refreshToken);

    // Reusar o refresh antigo deve falhar (foi revogado na rotacao).
    const reuse = await req("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
    expect(reuse.status).toBe(401);

    // O novo refresh funciona.
    const withNew = await req("/auth/refresh", {
      method: "POST",
      body: { refreshToken: first.body.refreshToken },
    });
    expect(withNew.status).toBe(200);
  });

  it("logout revoga o refresh", async () => {
    const { refreshToken } = await registerUser("out@teste.com");
    const out = await req("/auth/logout", {
      method: "POST",
      body: { refreshToken },
    });
    expect(out.status).toBe(200);
    const afterLogout = await req("/auth/refresh", {
      method: "POST",
      body: { refreshToken },
    });
    expect(afterLogout.status).toBe(401);
  });
});
