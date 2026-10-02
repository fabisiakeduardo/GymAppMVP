import { describe, it, expect, beforeEach } from "bun:test";
import { req, resetDb, registerUser } from "./helpers";

describe("validacao de input (TypeBox)", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("rejeita registro com email invalido", async () => {
    const { status } = await req("/auth/register", {
      method: "POST",
      body: { email: "nao-e-email", username: "testeuser", password: "senhaForte123", name: "X" },
    });
    expect(status).toBe(422);
  });

  it("rejeita senha curta", async () => {
    const { status } = await req("/auth/register", {
      method: "POST",
      body: { email: "ok@teste.com", username: "testeuser", password: "123", name: "X" },
    });
    expect(status).toBe(422);
  });

  it("rejeita rpe fora do range ao logar serie", async () => {
    const { accessToken } = await registerUser();
    const { body: w } = await req("/workouts", {
      method: "POST",
      token: accessToken,
      body: {},
    });
    const { body: exs } = await req("/exercises", { token: accessToken });
    const exerciseId = exs.exercises[0].id;

    const { status } = await req(`/workouts/${w.workout.id}/sets`, {
      method: "POST",
      token: accessToken,
      body: { exerciseId, setNumber: 1, reps: 10, weight: 80, rpe: 99 },
    });
    expect(status).toBe(422);
  });

  it("rejeita peso corporal absurdo em body-metrics", async () => {
    const { accessToken } = await registerUser();
    const { status } = await req("/body-metrics", {
      method: "POST",
      token: accessToken,
      body: { weightKg: 5 },
    });
    expect(status).toBe(422);
  });
});
