import { describe, it, expect, beforeEach } from "bun:test";
import { req, resetDb, registerUser } from "./helpers";

async function firstExerciseId(token: string) {
  const { body } = await req("/exercises", { token });
  return body.exercises[0].id as string;
}

describe("fluxo de treino ao vivo + stats", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("loga treino, calcula PR e progressao", async () => {
    const { accessToken } = await registerUser();
    const exerciseId = await firstExerciseId(accessToken);

    // Treino 1
    const w1 = await req("/workouts", { method: "POST", token: accessToken, body: {} });
    await req(`/workouts/${w1.body.workout.id}/sets`, {
      method: "POST",
      token: accessToken,
      body: { exerciseId, setNumber: 1, reps: 8, weight: 80, completed: true },
    });
    await req(`/workouts/${w1.body.workout.id}`, {
      method: "PATCH",
      token: accessToken,
      body: {},
    });

    // Treino 2 (PR de carga)
    const w2 = await req("/workouts", { method: "POST", token: accessToken, body: {} });
    await req(`/workouts/${w2.body.workout.id}/sets`, {
      method: "POST",
      token: accessToken,
      body: { exerciseId, setNumber: 1, reps: 3, weight: 100, completed: true },
    });

    const prs = await req("/stats/prs", { token: accessToken });
    expect(prs.status).toBe(200);
    const pr = prs.body.prs.find((p: { exerciseId: string }) => p.exerciseId === exerciseId);
    expect(pr.maxWeight).toBe(100);
    expect(pr.exerciseName).toBeString();

    const prog = await req(`/stats/progression?exerciseId=${exerciseId}`, {
      token: accessToken,
    });
    expect(prog.status).toBe(200);
    expect(prog.body.points.length).toBeGreaterThanOrEqual(1);
  });

  it("nao deixa ver treino de outro usuario", async () => {
    const a = await registerUser("a@teste.com");
    const b = await registerUser("b@teste.com");
    const w = await req("/workouts", { method: "POST", token: a.accessToken, body: {} });

    const asB = await req(`/workouts/${w.body.workout.id}`, { token: b.accessToken });
    expect(asB.status).toBe(404);
  });

  it("historico vem paginado", async () => {
    const { accessToken } = await registerUser();
    await req("/workouts", { method: "POST", token: accessToken, body: {} });
    const list = await req("/workouts?page=1&pageSize=10", { token: accessToken });
    expect(list.status).toBe(200);
    expect(list.body.total).toBe(1);
    expect(list.body.workouts).toHaveLength(1);
  });
});

describe("exercicios: globais read-only, custom do dono", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("nao deixa editar exercicio global", async () => {
    const { accessToken } = await registerUser();
    const globalId = await firstExerciseId(accessToken);
    const { status, body } = await req(`/exercises/${globalId}`, {
      method: "PATCH",
      token: accessToken,
      body: { name: "Hackeado" },
    });
    expect(status).toBe(403);
    expect(body.error.code).toBe("READ_ONLY");
  });

  it("cria exercicio custom e ele aparece na lista", async () => {
    const { accessToken } = await registerUser();
    const created = await req("/exercises", {
      method: "POST",
      token: accessToken,
      body: { name: "Rosca concentrada", muscleGroup: "biceps", equipment: "halter" },
    });
    expect(created.status).toBe(201);
    expect(created.body.exercise.isCustom).toBe(true);
  });
});

describe("rotinas com exercicios aninhados", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("cria rotina com exercicios e le de volta", async () => {
    const { accessToken } = await registerUser();
    const exerciseId = await firstExerciseId(accessToken);
    const created = await req("/routines", {
      method: "POST",
      token: accessToken,
      body: {
        name: "Peito e triceps",
        exercises: [
          { exerciseId, order: 0, targetSets: 4, targetReps: 8, targetWeight: 80 },
        ],
      },
    });
    expect(created.status).toBe(201);

    const got = await req(`/routines/${created.body.routine.id}`, { token: accessToken });
    expect(got.status).toBe(200);
    expect(got.body.routine.exercises).toHaveLength(1);
    expect(got.body.routine.exercises[0].targetSets).toBe(4);
  });
});
