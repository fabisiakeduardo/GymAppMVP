import type { Goal } from "@gymapp/shared/constants";

export interface User {
  id: string;
  email: string;
  name: string;
  goal: Goal;
  heightCm: number | null;
  birthDate: string | null; // YYYY-MM-DD
  avatarUrl: string | null; // data URL ou http(s)
  bio: string | null;
  isPrivate: boolean;
  // O que o dono deixa aparecer no perfil publico.
  showRoutines: boolean;
  showStats: boolean;
  showBodyMetrics: boolean;
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
  source: "manual" | "ai";
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
  date: string; // YYYY-MM-DD
  weightKg: number | null;
  bodyFat: number | null;
  measurements: Record<string, number>;
  photoUrl: string | null;
}

export interface BodyMetricInput {
  date?: string;
  weightKg?: number | null;
  bodyFat?: number | null;
  measurements?: Record<string, number>;
}

export interface ProfileStats {
  totalWorkouts: number;
  totalSets: number;
  totalVolumeKg: number;
  weeklyStreak: number;
  lastWorkoutAt: string | null;
  favoriteExercise: { exerciseId: string; name: string; times: number } | null;
}

// ---------------------------------------------------------------------------
// Social
// ---------------------------------------------------------------------------

// Perfil publico — nunca carrega email.
export interface SocialUser {
  id: string;
  name: string;
  avatarUrl: string | null;
  bio: string | null;
  isPrivate: boolean;
}

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

export interface Post {
  id: string;
  createdAt: string;
  caption: string | null;
  mediaUrls: string[];
  snapshot: PostSnapshot[];
  workoutId: string | null;
  routineId: string | null;
  bodyMetricId: string | null;
  author: SocialUser;
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
}

export interface FeedResponse {
  posts: Post[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface DiscoverResponse extends FeedResponse {
  suggested: Array<SocialUser & { followersCount: number }>;
}

export interface SocialProfile extends SocialUser {
  followersCount: number;
  followingCount: number;
  postsCount: number;
  isFollowing: boolean;
  isPending: boolean;
  isMe: boolean;
  canView: boolean;
  // Flags do dono + secoes enriquecidas (null quando escondido/sem acesso).
  showRoutines: boolean;
  showStats: boolean;
  showBodyMetrics: boolean;
  stats: ProfileStats | null;
  latestMetric: { date: string; weightKg: number | null; bodyFat: number | null } | null;
  routinesCount: number | null;
}

// Rotina listada no perfil publico de outro usuario.
export interface PublicRoutine {
  id: string;
  name: string;
  exercises: {
    name: string;
    targetSets: number;
    targetReps: number;
    targetWeight: number | null;
  }[];
}

// Item da aba Atividade (notificacao in-app).
export type NotificationType =
  | "follow"
  | "follow_request"
  | "follow_accepted"
  | "like"
  | "comment"
  | "story_like";

export interface AppNotification {
  id: string;
  type: NotificationType;
  createdAt: string;
  seen: boolean;
  postId: string | null;
  storyId: string | null;
  actor: SocialUser;
  // follow_request ainda pendente -> mostra Aceitar/Recusar inline.
  requestPending: boolean;
}

// Quem curtiu um post.
export interface Liker extends SocialUser {
  isMe: boolean;
  isFollowing: boolean;
  isPending: boolean;
}

export interface UserSearchResult extends SocialUser {
  isFollowing: boolean;
  isPending: boolean;
  followersCount: number;
}

export interface PostComment {
  id: string;
  body: string;
  createdAt: string;
  user: SocialUser;
  isMine: boolean;
}

export interface Story {
  id: string;
  mediaUrl: string;
  caption: string | null;
  createdAt: string;
  expiresAt: string;
  user: SocialUser;
  isMine: boolean;
  // Interacoes: quem viu ("Visto por" so vem no story do autor) e likes.
  viewCount: number;
  viewedByMe: boolean;
  likeCount: number;
  likedByMe: boolean;
  viewers: { user: SocialUser; liked: boolean }[];
}
