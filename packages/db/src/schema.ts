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
export const followStatusEnum = pgEnum("follow_status", ["accepted", "pending"]);
// Tipos de notificacao in-app (aba Atividade). follow_request so existe pra
// perfil privado; story_like e privado (so o autor ve quem curtiu o story).
export const notificationTypeEnum = pgEnum("notification_type", [
  "follow",
  "follow_request",
  "follow_accepted",
  "like",
  "comment",
  "story_like",
]);

// ---------------------------------------------------------------------------
// users
// ---------------------------------------------------------------------------
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  goal: goalEnum("goal").notNull().default("maintain"),
  heightCm: doublePrecision("height_cm"),
  birthDate: date("birth_date"),
  // Foto de perfil: data URL comprimida (MVP sem storage externo).
  avatarUrl: text("avatar_url"),
  bio: text("bio"),
  // Perfil privado: seguir vira pedido (follow pending) e posts so aparecem
  // pra seguidores aceitos.
  isPrivate: boolean("is_private").notNull().default(false),
  // Toggles do que aparece no perfil publico — o dono escolhe. Medidas
  // corporais sao sensivel, entao vem desligado por padrao.
  showRoutines: boolean("show_routines").notNull().default(true),
  showStats: boolean("show_stats").notNull().default(true),
  showBodyMetrics: boolean("show_body_metrics").notNull().default(false),
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
  // 'manual' | 'ai' — marca rotina montada pela IA quando esse recurso chegar.
  source: text("source").notNull().default("manual"),
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
// social: follows, posts, likes, comments
// ---------------------------------------------------------------------------

// Snapshot denormalizado do conteudo anexado ao post (treino/rotina/medida).
// Congelado no momento da publicacao: o feed nao depende da origem continuar
// existindo igual.
export interface WorkoutSnapshotExercise {
  exerciseId: string;
  name: string;
  sets: number;
  topWeight: number;
  topReps: number;
  bestE1RM: number;
}

export interface WorkoutSnapshot {
  kind: "workout";
  workoutId: string;
  routineName: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationSec: number | null;
  setsDone: number;
  volumeKg: number;
  exercises: WorkoutSnapshotExercise[];
}

export interface RoutineSnapshotExercise {
  exerciseId: string;
  name: string;
  muscleGroup: string;
  equipment: string;
  order: number;
  targetSets: number;
  targetReps: number;
  targetWeight: number | null;
}

export interface RoutineSnapshot {
  kind: "routine";
  name: string;
  exercises: RoutineSnapshotExercise[];
}

export interface BodyMetricSnapshot {
  kind: "body_metric";
  date: string;
  weightKg: number | null;
  bodyFat: number | null;
  measurements: Record<string, number>;
}

export type PostSnapshot = WorkoutSnapshot | RoutineSnapshot | BodyMetricSnapshot;

// Follow unidirecional. Em perfil privado o pedido nasce 'pending' ate o dono
// aceitar; em perfil publico nasce 'accepted'.
export const follows = pgTable("follows", {
  id: uuid("id").primaryKey().defaultRandom(),
  followerId: uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followingId: uuid("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  status: followStatusEnum("status").notNull().default("accepted"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pairIdx: uniqueIndex("follows_pair_unique").on(table.followerId, table.followingId),
  followerIdx: index("follows_follower_idx").on(table.followerId),
  followingIdx: index("follows_following_idx").on(table.followingId),
}));

// Post livre: legenda/foto sempre podem, e opcionalmente anexa treino,
// rotina compartilhavel ou medida corporal (combinaveis).
export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  caption: text("caption"),
  workoutId: uuid("workout_id").references(() => workouts.id, { onDelete: "set null" }),
  routineId: uuid("routine_id").references(() => routines.id, { onDelete: "set null" }),
  bodyMetricId: uuid("body_metric_id").references(() => bodyMetrics.id, { onDelete: "set null" }),
  // Fotos do post: data URLs comprimidas (mesmo padrao do avatar).
  mediaUrls: jsonb("media_urls").$type<string[]>().notNull().default([]),
  snapshot: jsonb("snapshot").$type<PostSnapshot[]>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("posts_user_idx").on(table.userId),
  createdIdx: index("posts_created_idx").on(table.createdAt),
}));

export const postLikes = pgTable("post_likes", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pairIdx: uniqueIndex("post_likes_pair_unique").on(table.postId, table.userId),
  postIdx: index("post_likes_post_idx").on(table.postId),
}));

export const postComments = pgTable("post_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  postIdx: index("post_comments_post_idx").on(table.postId),
}));

// Stories: foto + legenda opcional, expira 24h depois. Aparecem no topo do
// feed so pra quem pode ver o perfil do autor.
export const stories = pgTable("stories", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mediaUrl: text("media_url").notNull(),
  caption: text("caption"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("stories_user_idx").on(table.userId),
  expiresIdx: index("stories_expires_idx").on(table.expiresAt),
}));

// Quem viu cada story — o autor ve a lista ("Visto por"), igual Instagram.
export const storyViews = pgTable("story_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pairIdx: uniqueIndex("story_views_pair_unique").on(table.storyId, table.userId),
  storyIdx: index("story_views_story_idx").on(table.storyId),
}));

// Like de story: privado, so o autor ve quem curtiu (nao tem contador publico).
export const storyLikes = pgTable("story_likes", {
  id: uuid("id").primaryKey().defaultRandom(),
  storyId: uuid("story_id").notNull().references(() => stories.id, { onDelete: "cascade" }),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pairIdx: uniqueIndex("story_likes_pair_unique").on(table.storyId, table.userId),
  storyIdx: index("story_likes_story_idx").on(table.storyId),
}));

// Notificacoes in-app (aba Atividade). postId/storyId apontam pro conteudo
// relacionado quando faz sentido (like/comment/story_like).
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Dono da notificacao (quem recebe) e quem gerou (actor).
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: notificationTypeEnum("type").notNull(),
  postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
  storyId: uuid("story_id").references(() => stories.id, { onDelete: "cascade" }),
  seenAt: timestamp("seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdx: index("notifications_user_idx").on(table.userId, table.createdAt),
}));

// Expo push tokens por usuario (um device por linha).
export const pushTokens = pgTable("push_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  platform: text("platform"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  pairIdx: uniqueIndex("push_tokens_pair_unique").on(table.userId, table.token),
  userIdx: index("push_tokens_user_idx").on(table.userId),
}));

// ---------------------------------------------------------------------------
// body_metrics
// ---------------------------------------------------------------------------
export const bodyMetrics = pgTable("body_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  date: date("date").notNull().defaultNow(),
  // Nullable: um registro pode ser so de medidas/%gordura, sem peso.
  weightKg: doublePrecision("weight_kg"),
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
  posts: many(posts),
  stories: many(stories),
  // Quem eu sigo / quem me segue (relationName casa com os lados em follows).
  following: many(follows, { relationName: "follower" }),
  followers: many(follows, { relationName: "following" }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: "follower",
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: "following",
  }),
}));

export const postsRelations = relations(posts, ({ one, many }) => ({
  user: one(users, { fields: [posts.userId], references: [users.id] }),
  workout: one(workouts, { fields: [posts.workoutId], references: [workouts.id] }),
  routine: one(routines, { fields: [posts.routineId], references: [routines.id] }),
  bodyMetric: one(bodyMetrics, { fields: [posts.bodyMetricId], references: [bodyMetrics.id] }),
  likes: many(postLikes),
  comments: many(postComments),
}));

export const postLikesRelations = relations(postLikes, ({ one }) => ({
  post: one(posts, { fields: [postLikes.postId], references: [posts.id] }),
  user: one(users, { fields: [postLikes.userId], references: [users.id] }),
}));

export const postCommentsRelations = relations(postComments, ({ one }) => ({
  post: one(posts, { fields: [postComments.postId], references: [posts.id] }),
  user: one(users, { fields: [postComments.userId], references: [users.id] }),
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
  user: one(users, { fields: [stories.userId], references: [users.id] }),
  views: many(storyViews),
  likes: many(storyLikes),
}));

export const storyViewsRelations = relations(storyViews, ({ one }) => ({
  story: one(stories, { fields: [storyViews.storyId], references: [stories.id] }),
  user: one(users, { fields: [storyViews.userId], references: [users.id] }),
}));

export const storyLikesRelations = relations(storyLikes, ({ one }) => ({
  story: one(stories, { fields: [storyLikes.storyId], references: [stories.id] }),
  user: one(users, { fields: [storyLikes.userId], references: [users.id] }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
    relationName: "notification_user",
  }),
  actor: one(users, {
    fields: [notifications.actorId],
    references: [users.id],
    relationName: "notification_actor",
  }),
  post: one(posts, { fields: [notifications.postId], references: [posts.id] }),
  story: one(stories, { fields: [notifications.storyId], references: [stories.id] }),
}));

export const pushTokensRelations = relations(pushTokens, ({ one }) => ({
  user: one(users, { fields: [pushTokens.userId], references: [users.id] }),
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
export type Follow = typeof follows.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type PostLike = typeof postLikes.$inferSelect;
export type PostComment = typeof postComments.$inferSelect;
export type Story = typeof stories.$inferSelect;
export type StoryView = typeof storyViews.$inferSelect;
export type StoryLike = typeof storyLikes.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type PushToken = typeof pushTokens.$inferSelect;
