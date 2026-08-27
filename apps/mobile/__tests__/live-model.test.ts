import {
  createLiveWorkout,
  toggleSetComplete,
  addSet,
  addExercise,
  pendingSets,
  markSynced,
  workoutProgress,
  totalVolume,
  formatClock,
} from "../src/live/model";
import { lastPerformance } from "../src/live/lastTime";
import type { Workout } from "../src/api/types";

const seed = {
  id: "rot-1",
  exercises: [
    { exerciseId: "supino", name: "Supino reto", targetSets: 2, targetReps: 10, targetWeight: 80 },
  ],
};

describe("live workout model", () => {
  it("cria treino com series vazias a partir da rotina", () => {
    const w = createLiveWorkout(seed);
    expect(w.exercises).toHaveLength(1);
    expect(w.exercises[0].sets).toHaveLength(2);
    expect(w.exercises[0].sets[0].completed).toBe(false);
    expect(w.workoutId).toBeNull();
  });

  it("completa uma serie (imutavel) e marca como pendente de sync", () => {
    const w = createLiveWorkout(seed);
    const after = toggleSetComplete(w, "supino", 1, { weight: 82, reps: 8 });

    // imutabilidade
    expect(w.exercises[0].sets[0].completed).toBe(false);

    expect(after.exercises[0].sets[0].completed).toBe(true);
    expect(after.exercises[0].sets[0].weight).toBe(82);
    expect(after.exercises[0].sets[0].reps).toBe(8);

    const pending = pendingSets(after);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ exerciseId: "supino", setNumber: 1, weight: 82, reps: 8 });
  });

  it("nao re-envia serie ja sincronizada", () => {
    let w = createLiveWorkout(seed);
    w = toggleSetComplete(w, "supino", 1, { weight: 82, reps: 8 });
    w = markSynced(w, "supino", 1);
    expect(pendingSets(w)).toHaveLength(0);
  });

  it("adiciona serie extra herdando a carga da ultima serie", () => {
    let w = createLiveWorkout(seed);
    // edita a ultima serie (2) e adiciona uma extra: herda a carga dela.
    w = toggleSetComplete(w, "supino", 2, { weight: 90, reps: 5 });
    w = addSet(w, "supino");
    expect(w.exercises[0].sets).toHaveLength(3);
    expect(w.exercises[0].sets[2].weight).toBe(90);
  });

  it("adiciona exercicio novo em treino livre, sem duplicar", () => {
    let w = createLiveWorkout({ id: null, exercises: [] });
    w = addExercise(w, { exerciseId: "agacho", name: "Agachamento" });
    w = addExercise(w, { exerciseId: "agacho", name: "Agachamento" });
    expect(w.exercises).toHaveLength(1);
  });

  it("calcula progresso e volume so das series feitas", () => {
    let w = createLiveWorkout(seed);
    w = toggleSetComplete(w, "supino", 1, { weight: 80, reps: 10 });
    expect(workoutProgress(w)).toEqual({ done: 1, total: 2 });
    expect(totalVolume(w)).toBe(800);
  });

  it("formata o relogio em MM:SS", () => {
    expect(formatClock(0)).toBe("00:00");
    expect(formatClock(90)).toBe("01:30");
    expect(formatClock(605)).toBe("10:05");
  });
});

describe("lastPerformance (ultima vez)", () => {
  const history: Workout[] = [
    {
      id: "w1",
      userId: "u",
      routineId: null,
      startedAt: "2026-01-01T10:00:00.000Z",
      finishedAt: null,
      notes: null,
      sets: [
        { id: "s1", workoutId: "w1", exerciseId: "supino", setNumber: 1, reps: 10, weight: 70, rpe: null, completed: true },
        { id: "s2", workoutId: "w1", exerciseId: "supino", setNumber: 2, reps: 8, weight: 75, rpe: null, completed: true },
      ],
    },
    {
      id: "w2",
      userId: "u",
      routineId: null,
      startedAt: "2026-01-08T10:00:00.000Z",
      finishedAt: null,
      notes: null,
      sets: [
        { id: "s3", workoutId: "w2", exerciseId: "supino", setNumber: 1, reps: 6, weight: 85, rpe: null, completed: true },
      ],
    },
  ];

  it("pega a serie mais pesada do treino mais recente", () => {
    const last = lastPerformance(history, "supino");
    expect(last).not.toBeNull();
    expect(last!.weight).toBe(85);
    expect(last!.reps).toBe(6);
  });

  it("retorna null pra exercicio nunca treinado", () => {
    expect(lastPerformance(history, "terra")).toBeNull();
  });
});
