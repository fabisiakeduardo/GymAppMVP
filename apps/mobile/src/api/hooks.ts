import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "./client";
import type {
  User,
  Exercise,
  Routine,
  Workout,
  ProgressionPoint,
  PR,
  BodyMetric,
  BodyMetricInput,
  FeedResponse,
  DiscoverResponse,
  SocialUser,
  SocialProfile,
  UserSearchResult,
  Post,
  PostComment,
  Story,
  ProfileStats,
  AppNotification,
  Liker,
  PublicRoutine,
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
      bio?: string | null;
      isPrivate?: boolean;
      showRoutines?: boolean;
      showStats?: boolean;
      showBodyMetrics?: boolean;
    }) => apiFetch<{ user: User }>("/auth/me", { method: "PATCH", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

// --- Social ---
export function useFeed(page = 1) {
  return useQuery({
    queryKey: ["social", "feed", page],
    queryFn: () => apiFetch<FeedResponse>(`/social/feed?page=${page}&pageSize=20`),
  });
}

export function useDiscover(page = 1) {
  return useQuery({
    queryKey: ["social", "discover", page],
    queryFn: () => apiFetch<DiscoverResponse>(`/social/discover?page=${page}&pageSize=20`),
  });
}

export function useUserSearch(q: string) {
  return useQuery({
    queryKey: ["social", "search", q],
    queryFn: () =>
      apiFetch<{ users: UserSearchResult[] }>(
        `/social/users/search?q=${encodeURIComponent(q)}`,
      ).then((r) => r.users),
    enabled: q.trim().length > 0,
  });
}

export function useSocialProfile(userId: string) {
  return useQuery({
    queryKey: ["social", "profile", userId],
    queryFn: () =>
      apiFetch<{ profile: SocialProfile }>(`/social/users/${userId}`).then((r) => r.profile),
    enabled: !!userId,
  });
}

export function useUserPosts(userId: string, page = 1) {
  return useQuery({
    queryKey: ["social", "user-posts", userId, page],
    queryFn: () =>
      apiFetch<{ posts: Post[] }>(`/social/users/${userId}/posts?page=${page}&pageSize=20`),
    enabled: !!userId,
  });
}

export function useFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<{ status: "accepted" | "pending" }>(`/social/follows/${userId}`, {
        method: "POST",
      }),
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ["social", "profile", userId] });
      qc.invalidateQueries({ queryKey: ["social", "search"] });
      qc.invalidateQueries({ queryKey: ["social", "discover"] });
      qc.invalidateQueries({ queryKey: ["social", "followers"] });
      qc.invalidateQueries({ queryKey: ["social", "following"] });
      qc.invalidateQueries({ queryKey: ["social", "post-likes"] });
      qc.invalidateQueries({ queryKey: ["social", "stories"] });
      qc.invalidateQueries({ queryKey: ["social", "user-routines", userId] });
      qc.invalidateQueries({ queryKey: ["social", "notifications"] });
    },
  });
}

export function useUnfollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<{ ok: true }>(`/social/follows/${userId}`, { method: "DELETE" }),
    onSuccess: (_d, userId) => {
      qc.invalidateQueries({ queryKey: ["social", "profile", userId] });
      qc.invalidateQueries({ queryKey: ["social", "search"] });
      qc.invalidateQueries({ queryKey: ["social", "feed"] });
      qc.invalidateQueries({ queryKey: ["social", "discover"] });
      qc.invalidateQueries({ queryKey: ["social", "followers"] });
      qc.invalidateQueries({ queryKey: ["social", "following"] });
      qc.invalidateQueries({ queryKey: ["social", "post-likes"] });
      qc.invalidateQueries({ queryKey: ["social", "stories"] });
      qc.invalidateQueries({ queryKey: ["social", "user-routines", userId] });
      qc.invalidateQueries({ queryKey: ["social", "notifications"] });
    },
  });
}

export function useFollowRequests() {
  return useQuery({
    queryKey: ["social", "requests"],
    queryFn: () => apiFetch<{ requests: SocialUser[] }>("/social/requests").then((r) => r.requests),
  });
}

export function useAcceptFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<{ ok: boolean }>(`/social/requests/${userId}/accept`, { method: "POST" }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["social", "requests"] });
      qc.invalidateQueries({ queryKey: ["social", "followers"] });
      qc.invalidateQueries({ queryKey: ["social", "feed"] });
      qc.invalidateQueries({ queryKey: ["social", "stories"] });
      qc.invalidateQueries({ queryKey: ["social", "notifications"] });
    },
  });
}

export function useDeclineFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      apiFetch<{ ok: boolean }>(`/social/requests/${userId}/decline`, { method: "POST" }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["social", "requests"] });
      qc.invalidateQueries({ queryKey: ["social", "notifications"] });
    },
  });
}

export function useCreatePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      caption?: string;
      workoutId?: string;
      routineId?: string;
      bodyMetricId?: string;
      mediaUrls?: string[];
    }) => apiFetch<{ post: Post }>("/social/posts", { method: "POST", body }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["social", "feed"] });
      qc.invalidateQueries({ queryKey: ["social", "discover"] });
      qc.invalidateQueries({ queryKey: ["social", "posts"] });
      qc.invalidateQueries({ queryKey: ["social", "user-posts"] });
    },
  });
}

export function useDeletePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) =>
      apiFetch<{ ok: true }>(`/social/posts/${postId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social"] }),
  });
}

export function useLikePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postId, like }: { postId: string; like: boolean }) =>
      apiFetch<{ liked: boolean; likesCount: number }>(`/social/posts/${postId}/like`, {
        method: like ? "POST" : "DELETE",
      }),
    onSettled: (_, __, vars) => {
      qc.invalidateQueries({ queryKey: ["social", "post", vars.postId] });
      qc.invalidateQueries({ queryKey: ["social", "post-likes", vars.postId] });
      qc.invalidateQueries({ queryKey: ["social", "feed"] });
      qc.invalidateQueries({ queryKey: ["social", "discover"] });
      qc.invalidateQueries({ queryKey: ["social", "user-posts"] });
      qc.invalidateQueries({ queryKey: ["social", "notifications"] });
    },
  });
}

export function usePostLikes(postId: string) {
  return useQuery({
    queryKey: ["social", "post-likes", postId],
    queryFn: () => apiFetch<{ users: Liker[] }>(`/social/posts/${postId}/likes`),
    enabled: !!postId,
  });
}

export function useComments(postId: string) {
  return useQuery({
    queryKey: ["social", "comments", postId],
    queryFn: () =>
      apiFetch<{ comments: PostComment[] }>(`/social/posts/${postId}/comments?pageSize=100`).then(
        (r) => r.comments,
      ),
    enabled: !!postId,
  });
}

export function useAddComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: string) =>
      apiFetch<{ comment: PostComment }>(`/social/posts/${postId}/comments`, {
        method: "POST",
        body: { body },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social", "comments", postId] });
      qc.invalidateQueries({ queryKey: ["social", "post", postId] });
      qc.invalidateQueries({ queryKey: ["social", "feed"] });
      qc.invalidateQueries({ queryKey: ["social", "discover"] });
      qc.invalidateQueries({ queryKey: ["social", "notifications"] });
    },
  });
}

export function useDeleteComment(postId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (commentId: string) =>
      apiFetch<{ ok: true }>(`/social/comments/${commentId}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["social", "comments", postId] });
      qc.invalidateQueries({ queryKey: ["social", "post", postId] });
    },
  });
}

export function usePost(postId: string) {
  return useQuery({
    queryKey: ["social", "post", postId],
    queryFn: () => apiFetch<{ post: Post }>(`/social/posts/${postId}`).then((r) => r.post),
    enabled: !!postId,
  });
}

export function useSaveRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postId: string) =>
      apiFetch<{ routine: Routine }>(`/social/posts/${postId}/save-routine`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routines"] }),
  });
}

// --- Stories ---
export function useStories() {
  return useQuery({
    queryKey: ["social", "stories"],
    queryFn: () => apiFetch<{ stories: Story[] }>("/social/stories").then((r) => r.stories),
    staleTime: 15_000,
  });
}

export function useCreateStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { mediaUrl: string; caption?: string }) =>
      apiFetch<{ story: Story }>("/social/stories", { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social", "stories"] }),
  });
}

export function useDeleteStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (storyId: string) =>
      apiFetch<{ ok: true }>(`/social/stories/${storyId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["social", "stories"] }),
  });
}

// Marca view ao assistir (idempotente) e like privado de story.
export function useMarkStoryViewed() {
  return useMutation({
    mutationFn: (storyId: string) =>
      apiFetch<{ ok: true }>(`/social/stories/${storyId}/view`, { method: "POST" }),
  });
}

export function useLikeStory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ storyId, like }: { storyId: string; like: boolean }) =>
      apiFetch<{ liked: boolean }>(`/social/stories/${storyId}/like`, {
        method: like ? "POST" : "DELETE",
      }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["social", "stories"] });
      qc.invalidateQueries({ queryKey: ["social", "notifications"] });
    },
  });
}

// --- Atividade (notificacoes) + push ---
export function useNotifications() {
  return useQuery({
    queryKey: ["social", "notifications"],
    queryFn: () =>
      apiFetch<{ notifications: AppNotification[] }>("/social/notifications").then(
        (r) => r.notifications,
      ),
    staleTime: 15_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: ["social", "notifications", "unread"],
    queryFn: () => apiFetch<{ count: number }>("/social/notifications/unread-count"),
    refetchInterval: 30_000,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ ok: boolean }>("/social/notifications/read", { method: "POST" }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["social", "notifications"] }),
  });
}

export function useRegisterPushToken() {
  return useMutation({
    mutationFn: ({ token, platform }: { token: string; platform: string }) =>
      apiFetch<{ ok: boolean }>("/social/push-token", {
        method: "POST",
        body: { token, platform },
      }),
  });
}

// Rotinas publicas de um usuario + copia pro meu perfil.
export function useUserRoutines(userId: string, enabled = true) {
  return useQuery({
    queryKey: ["social", "user-routines", userId],
    queryFn: () =>
      apiFetch<{ routines: PublicRoutine[] }>(`/social/users/${userId}/routines`).then(
        (r) => r.routines,
      ),
    enabled: !!userId && enabled,
  });
}

export function useCopyRoutine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, routineId }: { userId: string; routineId: string }) =>
      apiFetch<{ routine: Routine }>(`/social/users/${userId}/routines/${routineId}/copy`, {
        method: "POST",
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["routines"] }),
  });
}

// --- Listas de seguidores / seguindo ---
export function useFollowers(userId: string) {
  return useQuery({
    queryKey: ["social", "followers", userId],
    queryFn: () =>
      apiFetch<{ users: SocialUser[] }>(`/social/users/${userId}/followers`).then((r) => r.users),
    enabled: !!userId,
  });
}

export function useFollowing(userId: string) {
  return useQuery({
    queryKey: ["social", "following", userId],
    queryFn: () =>
      apiFetch<{ users: SocialUser[] }>(`/social/users/${userId}/following`).then((r) => r.users),
    enabled: !!userId,
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
