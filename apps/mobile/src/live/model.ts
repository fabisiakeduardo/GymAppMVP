// Modelo puro do treino ao vivo. Sem React, sem I/O — da pra testar direto.
// O treino em andamento vive aqui e no AsyncStorage: NUNCA se perde, mesmo
// se a rede cair. As series sobem pro servidor quando a conexao volta.

export interface LiveSet {
  setNumber: number;
  reps: number;
  weight: number;
  rpe: number | null;
  completed: boolean;
  synced: boolean; // ja subiu pro servidor?
}

export interface LiveExercise {
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
  sets: LiveSet[];
}

export interface LiveWorkout {
  workoutId: string | null; // id do servidor (null enquanto offline)
  routineId: string | null;
  startedAt: string; // ISO
  restSeconds: number; // descanso padrao entre series
  exercises: LiveExercise[];
}

export interface RoutineSeed {
  id: string | null;
  restSeconds?: number;
  exercises: Array<{
    exerciseId: string;
    name: string;
    targetSets: number;
    targetReps: number;
    targetWeight: number | null;
  }>;
}

export function createLiveWorkout(seed: RoutineSeed, now = new Date()): LiveWorkout {
  return {
    workoutId: null,
    routineId: seed.id,
    startedAt: now.toISOString(),
    restSeconds: seed.restSeconds ?? 90,
    exercises: seed.exercises.map((e) => ({
      ...e,
      sets: emptySets(e.targetSets, e.targetReps, e.targetWeight),
    })),
  };
}

function emptySets(count: number, reps: number, weight: number | null): LiveSet[] {
  return Array.from({ length: Math.max(count, 1) }, (_, i) => ({
    setNumber: i + 1,
    reps,
    weight: weight ?? 0,
    rpe: null,
    completed: false,
    synced: false,
  }));
}

// Marca (ou desmarca) uma serie como feita. Devolve novo estado (imutavel).
export function toggleSetComplete(
  workout: LiveWorkout,
  exerciseId: string,
  setNumber: number,
  values?: { reps?: number; weight?: number; rpe?: number | null },
): LiveWorkout {
  return mapSet(workout, exerciseId, setNumber, (set) => ({
    ...set,
    ...(values?.reps !== undefined ? { reps: values.reps } : {}),
    ...(values?.weight !== undefined ? { weight: values.weight } : {}),
    ...(values?.rpe !== undefined ? { rpe: values.rpe } : {}),
    completed: !set.completed,
    // Ao desmarcar, some do servidor tambem seria necessario; no MVP marcar
    // de volta apenas re-enfileira. Manter simples: resetar synced.
    synced: set.completed ? set.synced : false,
  }));
}

export function editSet(
  workout: LiveWorkout,
  exerciseId: string,
  setNumber: number,
  values: { reps?: number; weight?: number; rpe?: number | null },
): LiveWorkout {
  return mapSet(workout, exerciseId, setNumber, (set) => ({ ...set, ...values }));
}

// Adiciona uma serie a mais (o cara quis puxar alem do previsto).
export function addSet(workout: LiveWorkout, exerciseId: string): LiveWorkout {
  return {
    ...workout,
    exercises: workout.exercises.map((ex) => {
      if (ex.exerciseId !== exerciseId) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return {
        ...ex,
        sets: [
          ...ex.sets,
          {
            setNumber: ex.sets.length + 1,
            reps: last?.reps ?? ex.targetReps,
            weight: last?.weight ?? ex.targetWeight ?? 0,
            rpe: null,
            completed: false,
            synced: false,
          },
        ],
      };
    }),
  };
}

// Adiciona um exercicio ao treino em andamento (treino livre / puxou a mais).
export function addExercise(
  workout: LiveWorkout,
  exercise: { exerciseId: string; name: string },
): LiveWorkout {
  if (workout.exercises.some((e) => e.exerciseId === exercise.exerciseId)) {
    return workout; // ja esta no treino
  }
  return {
    ...workout,
    exercises: [
      ...workout.exercises,
      {
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        targetSets: 3,
        targetReps: 10,
        targetWeight: null,
        sets: emptySets(3, 10, null),
      },
    ],
  };
}

function mapSet(
  workout: LiveWorkout,
  exerciseId: string,
  setNumber: number,
  fn: (set: LiveSet) => LiveSet,
): LiveWorkout {
  return {
    ...workout,
    exercises: workout.exercises.map((ex) =>
      ex.exerciseId === exerciseId
        ? { ...ex, sets: ex.sets.map((s) => (s.setNumber === setNumber ? fn(s) : s)) }
        : ex,
    ),
  };
}

// Series completadas que ainda nao subiram pro servidor.
export function pendingSets(
  workout: LiveWorkout,
): Array<{ exerciseId: string; setNumber: number; reps: number; weight: number; rpe: number | null }> {
  const out: Array<{ exerciseId: string; setNumber: number; reps: number; weight: number; rpe: number | null }> = [];
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      if (set.completed && !set.synced) {
        out.push({
          exerciseId: ex.exerciseId,
          setNumber: set.setNumber,
          reps: set.reps,
          weight: set.weight,
          rpe: set.rpe,
        });
      }
    }
  }
  return out;
}

export function markSynced(
  workout: LiveWorkout,
  exerciseId: string,
  setNumber: number,
): LiveWorkout {
  return mapSet(workout, exerciseId, setNumber, (s) => ({ ...s, synced: true }));
}

// Progresso: quantas series feitas de quantas previstas.
export function workoutProgress(workout: LiveWorkout): { done: number; total: number } {
  let done = 0;
  let total = 0;
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      total++;
      if (set.completed) done++;
    }
  }
  return { done, total };
}

export function totalVolume(workout: LiveWorkout): number {
  let vol = 0;
  for (const ex of workout.exercises) {
    for (const set of ex.sets) {
      if (set.completed) vol += set.weight * set.reps;
    }
  }
  return vol;
}

// "MM:SS" pro cronometro de descanso e pra duracao do treino.
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${String(m).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}
