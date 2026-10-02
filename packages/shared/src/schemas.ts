import { Type as t, type Static } from "@sinclair/typebox";
import { GOALS, MUSCLE_GROUPS, EQUIPMENT } from "./constants";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

// Pattern do @: letras/numeros/underline/ponto, 3-30 chars. A API normaliza
// pra minusculo — maiusculas entram no input mas nunca persistem.
export const USERNAME_PATTERN = "^[a-zA-Z0-9_.]{3,30}$";
const UsernameField = t.String({ pattern: USERNAME_PATTERN });

export const RegisterInput = t.Object({
  email: t.String({ format: "email", maxLength: 254 }),
  username: UsernameField,
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

// Check publico de @ disponivel (tela de registro pergunta enquanto digita).
export const UsernameAvailableQuery = t.Object({
  u: t.String({ minLength: 1, maxLength: 30 }),
});
export type UsernameAvailableQuery = Static<typeof UsernameAvailableQuery>;

// Troca de senha: exige a atual e revoga sessoes antigas no servidor.
export const ChangePasswordInput = t.Object({
  currentPassword: t.String({ minLength: 1, maxLength: 128 }),
  newPassword: t.String({ minLength: 8, maxLength: 128 }),
});
export type ChangePasswordInput = Static<typeof ChangePasswordInput>;

export const UpdateMeInput = t.Object({
  name: t.Optional(t.String({ minLength: 1, maxLength: 80 })),
  username: t.Optional(UsernameField),
  goal: t.Optional(t.Union(GOALS.map((g) => t.Literal(g)))),
  // Altura em cm e nascimento (YYYY-MM-DD) — null limpa o campo.
  heightCm: t.Optional(t.Union([t.Number({ minimum: 50, maximum: 300 }), t.Null()])),
  birthDate: t.Optional(t.Union([t.String({ format: "date" }), t.Null()])),
  // Avatar: URL http(s) ou data URL (~400KB teto; o app comprime pra ~30KB).
  avatarUrl: t.Optional(t.Union([t.String({ maxLength: 400_000 }), t.Null()])),
  bio: t.Optional(t.Union([t.String({ maxLength: 160 }), t.Null()])),
  isPrivate: t.Optional(t.Boolean()),
  // O que aparece no perfil publico — o dono escolhe.
  showRoutines: t.Optional(t.Boolean()),
  showStats: t.Optional(t.Boolean()),
  showBodyMetrics: t.Optional(t.Boolean()),
});
export type UpdateMeInput = Static<typeof UpdateMeInput>;

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

// Um registro de corpo pode ser so peso, so medida, so %gordura ou tudo junto.
export const CreateBodyMetricInput = t.Object({
  date: t.Optional(t.String({ format: "date" })),
  weightKg: t.Optional(t.Union([t.Number({ minimum: 20, maximum: 500 }), t.Null()])),
  bodyFat: t.Optional(t.Union([t.Number({ minimum: 1, maximum: 70 }), t.Null()])),
  measurements: t.Optional(
    t.Record(t.String(), t.Union([t.Number({ minimum: 0, maximum: 500 }), t.Null()])),
  ),
  photoUrl: t.Optional(t.Union([t.String({ maxLength: 500 }), t.Null()])),
});
export type CreateBodyMetricInput = Static<typeof CreateBodyMetricInput>;

export const UpdateBodyMetricInput = t.Partial(CreateBodyMetricInput);
export type UpdateBodyMetricInput = Static<typeof UpdateBodyMetricInput>;

// ---------------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------------

// Perfil publico minimo — nunca expoe email.
export const SocialUser = t.Object({
  id: t.String(),
  name: t.String(),
  username: t.String(),
  avatarUrl: t.Union([t.String(), t.Null()]),
  bio: t.Union([t.String(), t.Null()]),
  isPrivate: t.Boolean(),
});
export type SocialUser = Static<typeof SocialUser>;

// Post livre: qualquer combinacao de legenda, fotos (data URL), treino do
// logbook, rotina compartilhavel e medida corporal. Pelo menos um campo
// precisa vir preenchido (a rota valida).
export const CreatePostInput = t.Object({
  caption: t.Optional(t.String({ maxLength: 2000 })),
  workoutId: t.Optional(t.String()),
  routineId: t.Optional(t.String()),
  bodyMetricId: t.Optional(t.String()),
  mediaUrls: t.Optional(t.Array(t.String({ maxLength: 400_000 }), { maxItems: 4 })),
});
export type CreatePostInput = Static<typeof CreatePostInput>;

export const CreateCommentInput = t.Object({
  body: t.String({ minLength: 1, maxLength: 500 }),
});
export type CreateCommentInput = Static<typeof CreateCommentInput>;

export const UserSearchQuery = t.Object({
  q: t.Optional(t.String({ maxLength: 80 })),
});
export type UserSearchQuery = Static<typeof UserSearchQuery>;

// Story: foto (data URL comprimida) + legenda curta opcional. Expira em 24h.
export const CreateStoryInput = t.Object({
  mediaUrl: t.String({ minLength: 10, maxLength: 400_000 }),
  caption: t.Optional(t.String({ maxLength: 200 })),
});
export type CreateStoryInput = Static<typeof CreateStoryInput>;

// Registro de Expo push token pra notificacoes push.
export const PushTokenInput = t.Object({
  token: t.String({ minLength: 5, maxLength: 200 }),
  platform: t.Optional(t.String({ maxLength: 20 })),
});
export type PushTokenInput = Static<typeof PushTokenInput>;

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

// Cuidado: pra QUERY params nao use este schema — Integer aqui (typebox puro)
// nao coage "1" -> 1. Declare o schema inline com o `t` do elysia na rota.
export const PaginationQuery = t.Object({
  page: t.Optional(t.Integer({ minimum: 1 })),
  pageSize: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
});
export type PaginationQuery = Static<typeof PaginationQuery>;
