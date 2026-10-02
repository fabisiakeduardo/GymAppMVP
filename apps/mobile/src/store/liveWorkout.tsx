import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { estimate1RM } from "@gymapp/shared/logic";
import { apiFetch } from "../api/client";
import { getDefaultRestSeconds } from "./prefs";
import {
  type LiveWorkout,
  type RoutineSeed,
  createLiveWorkout,
  toggleSetComplete,
  editSet,
  addSet,
  addExercise,
  pendingSets,
  markSynced,
} from "../live/model";

const STORAGE_KEY = "gymapp.liveWorkout";

// Resumo do treino que acabou de encerrar — alimenta a tela de conclusao.
export interface FinishedWorkout {
  workoutId: string | null;
  startedAt: string;
  finishedAt: string;
  setsDone: number;
  setsTotal: number;
  volumeKg: number;
  exercises: Array<{
    exerciseId: string;
    name: string;
    topWeight: number;
    topReps: number;
    bestE1RM: number;
  }>;
}

interface LiveState {
  workout: LiveWorkout | null;
  hydrated: boolean;
  syncing: boolean;
  lastFinished: FinishedWorkout | null;
  start: (seed: RoutineSeed) => Promise<void>;
  completeSet: (
    exerciseId: string,
    setNumber: number,
    values?: { reps?: number; weight?: number; rpe?: number | null },
  ) => void;
  updateSet: (
    exerciseId: string,
    setNumber: number,
    values: { reps?: number; weight?: number; rpe?: number | null },
  ) => void;
  addExtraSet: (exerciseId: string) => void;
  addExerciseToWorkout: (exercise: { exerciseId: string; name: string }) => void;
  setRestSeconds: (seconds: number) => void;
  finish: () => Promise<void>;
  discard: () => Promise<void>;
  clearLastFinished: () => void;
}

// Snapshot do treino antes de limpar — a tela de resumo le isso.
function toFinished(workout: LiveWorkout): FinishedWorkout {
  let setsDone = 0;
  let setsTotal = 0;
  let volumeKg = 0;
  const exercises = workout.exercises.map((ex) => {
    let topWeight = 0;
    let topReps = 0;
    let bestE1RM = 0;
    for (const s of ex.sets) {
      setsTotal++;
      if (!s.completed) continue;
      setsDone++;
      volumeKg += s.weight * s.reps;
      if (s.weight > topWeight) {
        topWeight = s.weight;
        topReps = s.reps;
      }
      const e1rm = estimate1RM(s.weight, s.reps);
      if (e1rm > bestE1RM) bestE1RM = e1rm;
    }
    return { exerciseId: ex.exerciseId, name: ex.name, topWeight, topReps, bestE1RM };
  });
  return {
    workoutId: workout.workoutId,
    startedAt: workout.startedAt,
    finishedAt: new Date().toISOString(),
    setsDone,
    setsTotal,
    volumeKg,
    exercises: exercises.filter((e) => e.topWeight > 0 || e.bestE1RM > 0),
  };
}

const LiveContext = createContext<LiveState | null>(null);

export function LiveWorkoutProvider({ children }: { children: React.ReactNode }) {
  const [workout, setWorkout] = useState<LiveWorkout | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastFinished, setLastFinished] = useState<FinishedWorkout | null>(null);
  const workoutRef = useRef<LiveWorkout | null>(null);

  // Persiste no AsyncStorage a cada mudanca (o treino nunca se perde).
  const persist = useCallback((next: LiveWorkout | null) => {
    workoutRef.current = next;
    setWorkout(next);
    if (next) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
    else AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, []);

  // Recupera treino em andamento ao abrir o app.
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as LiveWorkout;
          workoutRef.current = parsed;
          setWorkout(parsed);
        }
      } catch {
        // ignora estado corrompido
      } finally {
        setHydrated(true);
      }
    })();
  }, []);

  // Garante que o treino existe no servidor e sobe as series pendentes.
  const flush = useCallback(async () => {
    let current = workoutRef.current;
    if (!current) return;
    setSyncing(true);
    try {
      if (!current.workoutId) {
        const res = await apiFetch<{ workout: { id: string } }>("/workouts", {
          method: "POST",
          body: { routineId: current.routineId },
        });
        current = { ...current, workoutId: res.workout.id };
        persist(current);
      }
      for (const set of pendingSets(current)) {
        await apiFetch(`/workouts/${current.workoutId}/sets`, {
          method: "POST",
          body: set,
        });
        current = markSynced(current, set.exerciseId, set.setNumber);
        persist(current);
      }
    } catch {
      // offline: mantem pendente, tenta de novo depois
    } finally {
      setSyncing(false);
    }
  }, [persist]);

  const start = useCallback(
    async (seed: RoutineSeed) => {
      // Rotina pode definir o descanso dela; se nao, usa a preferencia do user.
      const restSeconds = seed.restSeconds ?? (await getDefaultRestSeconds());
      const fresh = createLiveWorkout({ ...seed, restSeconds });
      persist(fresh);
      await flush(); // cria no servidor ja de cara (best-effort)
    },
    [persist, flush],
  );

  const completeSet = useCallback(
    (
      exerciseId: string,
      setNumber: number,
      values?: { reps?: number; weight?: number; rpe?: number | null },
    ) => {
      if (!workoutRef.current) return;
      persist(toggleSetComplete(workoutRef.current, exerciseId, setNumber, values));
      flush();
    },
    [persist, flush],
  );

  const updateSet = useCallback(
    (
      exerciseId: string,
      setNumber: number,
      values: { reps?: number; weight?: number; rpe?: number | null },
    ) => {
      if (!workoutRef.current) return;
      persist(editSet(workoutRef.current, exerciseId, setNumber, values));
    },
    [persist],
  );

  const addExtraSet = useCallback(
    (exerciseId: string) => {
      if (!workoutRef.current) return;
      persist(addSet(workoutRef.current, exerciseId));
    },
    [persist],
  );

  const addExerciseToWorkout = useCallback(
    (exercise: { exerciseId: string; name: string }) => {
      if (!workoutRef.current) return;
      persist(addExercise(workoutRef.current, exercise));
    },
    [persist],
  );

  const setRestSeconds = useCallback(
    (seconds: number) => {
      if (!workoutRef.current) return;
      persist({ ...workoutRef.current, restSeconds: seconds });
    },
    [persist],
  );

  const finish = useCallback(async () => {
    const current = workoutRef.current;
    if (!current) return;
    await flush();
    if (current.workoutId) {
      try {
        await apiFetch(`/workouts/${current.workoutId}`, {
          method: "PATCH",
          body: { finishedAt: new Date().toISOString() },
        });
      } catch {
        // fica pendente; o treino ja esta salvo com as series
      }
    }
    // Guarda o resumo antes de limpar — a tela /workout/done le isso.
    setLastFinished(toFinished(current));
    persist(null);
  }, [flush, persist]);

  const discard = useCallback(async () => {
    persist(null);
  }, [persist]);

  const clearLastFinished = useCallback(() => setLastFinished(null), []);

  return (
    <LiveContext.Provider
      value={{ workout, hydrated, syncing, lastFinished, start, completeSet, updateSet, addExtraSet, addExerciseToWorkout, setRestSeconds, finish, discard, clearLastFinished }}
    >
      {children}
    </LiveContext.Provider>
  );
}

export function useLiveWorkout(): LiveState {
  const ctx = useContext(LiveContext);
  if (!ctx) throw new Error("useLiveWorkout precisa estar dentro de <LiveWorkoutProvider>");
  return ctx;
}
