import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type {
  Exercise,
  Routine,
  Workout,
  PR,
  ProgressionPoint,
  BodyMetric,
  BodyMetricInput,
  ProfileStats,
  User,
} from "./types";
import type { Goal } from "@gymapp/shared/constants";

// --- Perfil / conta ---
export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string;
      goal?: Goal;
      heightCm?: number | null;
      birthDate?: string | null;
      avatarUrl?: string | null;
    }) => apiFetch<{ user: User }>("/auth/me", { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

// --- Exercises ---
export function useExercises() {
  return useQuery({
    queryKey: ["exercises"],
    queryFn: () => apiFetch<{ exercises: Exercise[] }>("/exercises").then((r) => r.exercises),
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; muscleGroup: string; equipment: string }) =>
      apiFetch<{ exercise: Exercise }>("/exercises", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["exercises"] }),
  });
}

// --- Routines ---
export function useRoutines() {
  return useQuery({
    queryKey: ["routines"],
    queryFn: () => apiFetch<{ routines: Routine[] }>("/routines").then((r) => r.routines),
  });
}

export function useRoutine(id: string) {
  return useQuery({
    queryKey: ["routines", id],
    queryFn: () => apiFetch<{ routine: Routine }>(`/routines/${id}`).then((r) => r.routine),
    enabled: !!id,
  });
}

export interface RoutineExerciseInput {
  exerciseId: string;
  order: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
}

export function useCreateRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name: string; exercises: RoutineExerciseInput[] }) =>
      apiFetch<{ routine: Routine }>("/routines", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routines"] }),
  });
}

export function useUpdateRoutine(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { name?: string; exercises?: RoutineExerciseInput[] }) =>
      apiFetch<{ routine: Routine }>(`/routines/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routines"] }),
  });
}

export function useDeleteRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiFetch<{ ok: true }>(`/routines/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routines"] }),
  });
}

// --- Workouts ---
export function useWorkoutHistory() {
  return useQuery({
    queryKey: ["workouts"],
    queryFn: () =>
      apiFetch<{ workouts: Workout[]; total: number }>("/workouts?page=1&pageSize=50"),
  });
}

export function useWorkout(id: string) {
  return useQuery({
    queryKey: ["workouts", id],
    queryFn: () => apiFetch<{ workout: Workout }>(`/workouts/${id}`).then((r) => r.workout),
    enabled: !!id,
  });
}

// --- Stats ---
export function usePRs() {
  return useQuery({
    queryKey: ["prs"],
    queryFn: () => apiFetch<{ prs: PR[] }>("/stats/prs").then((r) => r.prs),
  });
}

export function useProgression(exerciseId: string | null) {
  return useQuery({
    queryKey: ["progression", exerciseId],
    queryFn: () =>
      apiFetch<{ points: ProgressionPoint[] }>(
        `/stats/progression?exerciseId=${exerciseId}`,
      ).then((r) => r.points),
    enabled: !!exerciseId,
  });
}

// --- Body metrics ---
export function useBodyMetrics() {
  return useQuery({
    queryKey: ["body-metrics"],
    queryFn: () =>
      apiFetch<{ metrics: BodyMetric[] }>("/body-metrics").then((r) => r.metrics),
  });
}

export function useAddBodyMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BodyMetricInput) =>
      apiFetch<{ metric: BodyMetric }>("/body-metrics", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["body-metrics"] }),
  });
}

export function useUpdateBodyMetric(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: BodyMetricInput) =>
      apiFetch<{ metric: BodyMetric }>(`/body-metrics/${id}`, { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["body-metrics"] }),
  });
}

export function useDeleteBodyMetric() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/body-metrics/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["body-metrics"] }),
  });
}

// --- Stats ---
export function useProfileStats() {
  return useQuery({
    queryKey: ["profile-stats"],
    queryFn: () => apiFetch<{ stats: ProfileStats }>("/stats/profile").then((r) => r.stats),
  });
}
