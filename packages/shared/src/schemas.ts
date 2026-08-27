import { Type as t, type Static } from "@sinclair/typebox";
import { GOALS, MUSCLE_GROUPS, EQUIPMENT } from "./constants";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const RegisterInput = t.Object({
  email: t.String({ format: "email", maxLength: 254 }),
  password: t.String({ minLength: 8, maxLength: 128 }),
  name: t.String({ minLength: 1, maxLength: 80 }),
  goal: t.Optional(t.Union(GOALS.map((g) => t.Literal(g)))),
});
export type RegisterInput = Static<typeof RegisterInput>;

export const LoginInput = t.Object({
  email: t.String({ format: "email", maxLength: 254 }),
  password: t.String({ minLength: 1, maxLength: 128 }),
});
export type LoginInput = Static<typeof LoginInput>;

export const RefreshInput = t.Object({
  refreshToken: t.String({ minLength: 10 }),
});
export type RefreshInput = Static<typeof RefreshInput>;

export const AuthTokens = t.Object({
  accessToken: t.String(),
  refreshToken: t.String(),
  expiresIn: t.Number(),
});
export type AuthTokens = Static<typeof AuthTokens>;

export const PublicUser = t.Object({
  id: t.String(),
  email: t.String(),
  name: t.String(),
  goal: t.Union(GOALS.map((g) => t.Literal(g))),
  createdAt: t.String(),
});
export type PublicUser = Static<typeof PublicUser>;

// ---------------------------------------------------------------------------
// Exercises
// ---------------------------------------------------------------------------

const muscleGroup = t.Union(MUSCLE_GROUPS.map((m) => t.Literal(m)));
const equipment = t.Union(EQUIPMENT.map((e) => t.Literal(e)));

export const CreateExerciseInput = t.Object({
  name: t.String({ minLength: 2, maxLength: 80 }),
  muscleGroup,
  equipment,
});
export type CreateExerciseInput = Static<typeof CreateExerciseInput>;

export const UpdateExerciseInput = t.Partial(CreateExerciseInput);
export type UpdateExerciseInput = Static<typeof UpdateExerciseInput>;

// ---------------------------------------------------------------------------
// Routines
// ---------------------------------------------------------------------------

export const RoutineExerciseInput = t.Object({
  exerciseId: t.String(),
  order: t.Integer({ minimum: 0 }),
  targetSets: t.Integer({ minimum: 1, maximum: 30 }),
  targetReps: t.Integer({ minimum: 1, maximum: 100 }),
  targetWeight: t.Optional(t.Union([t.Number({ minimum: 0 }), t.Null()])),
});
export type RoutineExerciseInput = Static<typeof RoutineExerciseInput>;

export const CreateRoutineInput = t.Object({
  name: t.String({ minLength: 1, maxLength: 80 }),
  exercises: t.Array(RoutineExerciseInput, { minItems: 0, maxItems: 40 }),
});
export type CreateRoutineInput = Static<typeof CreateRoutineInput>;

export const UpdateRoutineInput = t.Partial(CreateRoutineInput);
export type UpdateRoutineInput = Static<typeof UpdateRoutineInput>;

// ---------------------------------------------------------------------------
// Workouts
// ---------------------------------------------------------------------------

export const StartWorkoutInput = t.Object({
  routineId: t.Optional(t.Union([t.String(), t.Null()])),
  notes: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
});
export type StartWorkoutInput = Static<typeof StartWorkoutInput>;

export const FinishWorkoutInput = t.Object({
  finishedAt: t.Optional(t.String()),
  notes: t.Optional(t.Union([t.String({ maxLength: 1000 }), t.Null()])),
});
export type FinishWorkoutInput = Static<typeof FinishWorkoutInput>;

export const LogSetInput = t.Object({
  exerciseId: t.String(),
  setNumber: t.Integer({ minimum: 1, maximum: 50 }),
  reps: t.Integer({ minimum: 0, maximum: 1000 }),
  weight: t.Number({ minimum: 0, maximum: 1000 }),
  rpe: t.Optional(t.Union([t.Number({ minimum: 1, maximum: 10 }), t.Null()])),
  completed: t.Optional(t.Boolean()),
});
export type LogSetInput = Static<typeof LogSetInput>;

// ---------------------------------------------------------------------------
// Body metrics
// ---------------------------------------------------------------------------

export const CreateBodyMetricInput = t.Object({
  date: t.Optional(t.String()),
  weightKg: t.Number({ minimum: 20, maximum: 500 }),
  bodyFat: t.Optional(t.Union([t.Number({ minimum: 1, maximum: 70 }), t.Null()])),
  measurements: t.Optional(
    t.Record(t.String(), t.Number({ minimum: 0, maximum: 500 })),
  ),
  photoUrl: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()])),
});
export type CreateBodyMetricInput = Static<typeof CreateBodyMetricInput>;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export const PaginationQuery = t.Object({
  page: t.Optional(t.Integer({ minimum: 1 })),
  pageSize: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
});
export type PaginationQuery = Static<typeof PaginationQuery>;
