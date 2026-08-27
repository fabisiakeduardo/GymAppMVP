import {
  pgTable,
  uuid,
  text,
  timestamp,
  integer,
  boolean,
  doublePrecision,
  jsonb,
  date,
  pgEnum,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

export const goalEnum = pgEnum("goal", ["cut", "bulk", "maintain"]);

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  goal: goalEnum("goal").notNull().default("maintain"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: uniqueIndex("users_email_unique").on(sql`lower(${table.email})`),
}));

// ---------------------------------------------------------------------------
// refresh_tokens  (rotativos, guardados como hash)
// ---------------------------------------------------------------------------
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("refresh_tokens_user_idx").on(table.userId),
  hashIdx: index("refresh_tokens_hash_idx").on(table.tokenHash),
}));

// ---------------------------------------------------------------------------
// exercises  (globais = owner_id null, custom = pertencem ao user)
// ---------------------------------------------------------------------------
export const exercises = pgTable("exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  muscleGroup: text("muscle_group").notNull(),
  equipment: text("equipment").notNull(),
  isCustom: boolean("is_custom").notNull().default(false),
  ownerId: uuid("owner_id").references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  ownerIdx: index("exercises_owner_idx").on(table.ownerId),
}));

// ---------------------------------------------------------------------------
// routines
// ---------------------------------------------------------------------------
export const routines = pgTable("routines", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("routines_user_idx").on(table.userId),
}));

export const routineExercises = pgTable("routine_exercises", {
  id: uuid("id").primaryKey().defaultRandom(),
  routineId: uuid("routine_id").notNull().references(() => routines.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "restrict" }),
  order: integer("order").notNull().default(0),
  targetSets: integer("target_sets").notNull().default(3),
  targetReps: integer("target_reps").notNull().default(10),
  targetWeight: doublePrecision("target_weight"),
}, (table) => ({
  routineIdx: index("routine_exercises_routine_idx").on(table.routineId),
}));

// ---------------------------------------------------------------------------
// workouts + workout_sets
// ---------------------------------------------------------------------------
export const workouts = pgTable("workouts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  routineId: uuid("routine_id").references(() => routines.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("workouts_user_idx").on(table.userId),
  startedIdx: index("workouts_started_idx").on(table.startedAt),
}));

export const workoutSets = pgTable("workout_sets", {
  id: uuid("id").primaryKey().defaultRandom(),
  workoutId: uuid("workout_id").notNull().references(() => workouts.id, { onDelete: "cascade" }),
  exerciseId: uuid("exercise_id").notNull().references(() => exercises.id, { onDelete: "restrict" }),
  setNumber: integer("set_number").notNull(),
  reps: integer("reps").notNull(),
  weight: doublePrecision("weight").notNull(),
  rpe: doublePrecision("rpe"),
  completed: boolean("completed").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  workoutIdx: index("workout_sets_workout_idx").on(table.workoutId),
  exerciseIdx: index("workout_sets_exercise_idx").on(table.exerciseId),
}));

// ---------------------------------------------------------------------------
// body_metrics
// ---------------------------------------------------------------------------
export const bodyMetrics = pgTable("body_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull().defaultNow(),
  weightKg: doublePrecision("weight_kg").notNull(),
  bodyFat: doublePrecision("body_fat"),
  measurements: jsonb("measurements").$type<Record<string, number>>().default({}),
  photoUrl: text("photo_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("body_metrics_user_idx").on(table.userId),
}));

// ---------------------------------------------------------------------------
// relations
// ---------------------------------------------------------------------------
export const usersRelations = relations(users, ({ many }) => ({
  routines: many(routines),
  workouts: many(workouts),
  bodyMetrics: many(bodyMetrics),
  exercises: many(exercises),
}));

export const routinesRelations = relations(routines, ({ one, many }) => ({
  user: one(users, { fields: [routines.userId], references: [users.id] }),
  exercises: many(routineExercises),
}));

export const routineExercisesRelations = relations(routineExercises, ({ one }) => ({
  routine: one(routines, { fields: [routineExercises.routineId], references: [routines.id] }),
  exercise: one(exercises, { fields: [routineExercises.exerciseId], references: [exercises.id] }),
}));

export const workoutsRelations = relations(workouts, ({ one, many }) => ({
  user: one(users, { fields: [workouts.userId], references: [users.id] }),
  routine: one(routines, { fields: [workouts.routineId], references: [routines.id] }),
  sets: many(workoutSets),
}));

export const workoutSetsRelations = relations(workoutSets, ({ one }) => ({
  workout: one(workouts, { fields: [workoutSets.workoutId], references: [workouts.id] }),
  exercise: one(exercises, { fields: [workoutSets.exerciseId], references: [exercises.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Exercise = typeof exercises.$inferSelect;
export type Routine = typeof routines.$inferSelect;
export type Workout = typeof workouts.$inferSelect;
export type WorkoutSet = typeof workoutSets.$inferSelect;
export type BodyMetric = typeof bodyMetrics.$inferSelect;
