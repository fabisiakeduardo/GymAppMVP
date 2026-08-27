import type { Goal } from "@gymapp/shared";

export interface User {
  id: string;
  email: string;
  name: string;
  goal: Goal;
  createdAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  isCustom: boolean;
  ownerId: string | null;
}

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  order: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
  exercise: Exercise;
}

export interface Routine {
  id: string;
  name: string;
  createdAt: string;
  exercises: RoutineExercise[];
}

export interface WorkoutSet {
  id: string;
  workoutId: string;
  exerciseId: string;
  setNumber: number;
  reps: number;
  weight: number;
  rpe: number | null;
  completed: boolean;
  exercise?: Exercise;
}

export interface Workout {
  id: string;
  userId: string;
  routineId: string | null;
  startedAt: string;
  finishedAt: string | null;
  notes: string | null;
  routine?: Routine | null;
  sets: WorkoutSet[];
}

export interface PR {
  exerciseId: string;
  exerciseName: string;
  maxWeight: number;
  maxWeightReps: number;
  bestE1RM: number;
  maxVolumeSet: number;
  achievedAt: string;
}

export interface ProgressionPoint {
  date: string;
  topWeight: number;
  topE1RM: number;
  totalVolume: number;
}

export interface BodyMetric {
  id: string;
  date: string;
  weightKg: number;
  bodyFat: number | null;
  measurements: Record<string, number>;
  photoUrl: string | null;
}
