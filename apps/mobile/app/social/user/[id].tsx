import React, { useState } from "react";
import { View, Text, Pressable, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../../src/components/Avatar";
import { Button } from "../../../src/components/Button";
import { PostCard } from "../../../src/components/PostCard";
import { EmptyState, SkeletonRows, SectionTitle } from "../../../src/components/ui";
import { useAuth } from "../../../src/store/auth";
import {
  useSocialProfile,
  useUserPosts,
  useUserRoutines,
  useCopyRoutine,
  useFollow,
  useUnfollow,
} from "../../../src/api/hooks";
import { colors } from "../../../src/theme/colors";
import type { ProfileStats } from "../../../src/api/types";

function fmtVolume(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace(".", ",")}t`;
  return `${Math.round(kg)} kg`;
}

// Perfil publico de outro usuario (ou o seu, visto de fora): identidade,
// contagens, botao de seguir e os posts — se o perfil for visivel.
export default function PublicProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: profile, isLoading } = useSocialProfile(id ?? "");
  const { data: posts } = useUserPosts(id ?? "");
  // Rotinas publicas: so busca quando o perfil e visivel e o dono deixa.
  const showRoutines = !!profile?.canView && (profile.isMe || profile.showRoutines);
  const { data: routines } = useUserRoutines(id ?? "", showRoutines);
  const follow = useFollow();
  const unfollow = useUnfollow();
  const copyRoutine = useCopyRoutine();

  if (isLoading) {
    return (
      <Shell title="Perfil">
        <SkeletonRows count={4} />
      </Shell>
    );
  }
  if (!profile) {
    return (
      <Shell title="Perfil">
        <EmptyState
          icon="person-outline"
          title="Perfil não encontrado"
          body="Esse usuário não existe ou não pode ser visto."
        />
      </Shell>
    );
  }

  // Se abriu o proprio perfil pelo feed, manda pra tab Perfil (mais completa).
  const isMe = profile.isMe || user?.id === profile.id;

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      <View className="px-5 pt-2 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          className="w-11 h-11 justify-center"
        >
          <Ionicons name="chevron-back" size={26} color={colors.chalk} />
        </Pressable>
        <Text className="text-chalk text-2xl font-extrabold tracking-tight flex-1">
          Perfil
        </Text>
      </View>

      <FlatList
        data={profile.canView ? (posts?.posts ?? []) : []}
        keyExtractor={(p) => p.id}
        contentContainerClassName="px-5 pb-10"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Identidade */}
            <View className="flex-row items-center gap-4">
              <Avatar uri={profile.avatarUrl} name={profile.name} size={64} />
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5">
                  <Text
                    className="text-chalk text-2xl font-extrabold tracking-tight"
                    numberOfLines={1}
                  >
                    {profile.name}
                  </Text>
                  {profile.isPrivate ? (
                    <Ionicons name="lock-closed" size={14} color={colors.chalkFaint} />
                  ) : null}
                </View>
                {profile.bio ? (
                  <Text className="text-chalk-muted text-sm mt-1" numberOfLines={2}>
                    {profile.bio}
                  </Text>
                ) : null}
              </View>
            </View>

            {/* Contagens estilo Instagram — seguidores/seguindo abrem a lista */}
            <View className="flex-row bg-ink-900 border border-ink-800 rounded-2xl mt-4">
              {[
                { label: "Posts", value: profile.postsCount, href: null },
                {
                  label: "Seguidores",
                  value: profile.followersCount,
                  href: `/social/follows/${profile.id}?type=followers`,
                },
                {
                  label: "Seguindo",
                  value: profile.followingCount,
                  href: `/social/follows/${profile.id}?type=following`,
                },
              ].map((it, i) => (
                <Pressable
                  key={it.label}
                  onPress={it.href ? () => router.push(it.href as never) : undefined}
                  disabled={!it.href}
                  accessibilityRole="button"
                  accessibilityLabel={`${it.value} ${it.label}`}
                  className={`flex-1 py-3 items-center active:bg-ink-850 ${
                    i > 0 ? "border-l border-ink-800" : ""
                  }`}
                >
                  <Text
                    className="text-chalk text-lg font-extrabold"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {it.value}
                  </Text>
                  <Text className="text-chalk-faint text-[11px] mt-0.5">{it.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Acao principal: seguir / editar */}
            {isMe ? (
              <Button
                label="Editar perfil"
                variant="ghost"
                onPress={() => router.push("/profile/edit")}
              />
            ) : (
              <FollowButton
                isFollowing={profile.isFollowing}
                isPending={profile.isPending}
                busy={follow.isPending || unfollow.isPending}
                onPress={() =>
                  profile.isFollowing || profile.isPending
                    ? unfollow.mutate(profile.id)
                    : follow.mutate(profile.id)
                }
              />
            )}

            {!profile.canView ? (
              <EmptyState
                icon="lock-closed-outline"
                title="Perfil privado"
                body={
                  profile.isPending
                    ? "Pedido enviado. Você verá os posts quando for aceito."
                    : "Segue essa conta pra ver os posts."
                }
              />
            ) : null}

            {/* Secoes extras — o dono escolhe o que mostra (toggles no perfil) */}
            {profile.canView && profile.stats ? <StatsBlock stats={profile.stats} /> : null}

            {profile.canView && profile.latestMetric ? (
              <View className="flex-row gap-2 mt-2">
                {profile.latestMetric.weightKg != null ? (
                  <View className="flex-1 bg-ink-900 border border-ink-800 rounded-2xl p-3">
                    <Text className="text-chalk-faint text-[11px]">Peso</Text>
                    <Text
                      className="text-chalk text-lg font-extrabold mt-0.5"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {profile.latestMetric.weightKg} kg
                    </Text>
                  </View>
                ) : null}
                {profile.latestMetric.bodyFat != null ? (
                  <View className="flex-1 bg-ink-900 border border-ink-800 rounded-2xl p-3">
                    <Text className="text-chalk-faint text-[11px]">Gordura</Text>
                    <Text
                      className="text-chalk text-lg font-extrabold mt-0.5"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {profile.latestMetric.bodyFat}%
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            {profile.canView && (routines?.length ?? 0) > 0 ? (
              <View className="mt-4">
                <SectionTitle>Rotinas</SectionTitle>
                <View className="gap-2">
                  {routines!.map((r) => (
                    <RoutineCard
                      key={r.id}
                      routine={r}
                      canCopy={!isMe}
                      copying={copyRoutine.isPending}
                      onCopy={() => copyRoutine.mutate({ userId: profile.id, routineId: r.id })}
                    />
                  ))}
                </View>
              </View>
            ) : null}

            {profile.canView && (posts?.posts.length ?? 0) === 0 ? (
              <EmptyState
                icon="images-outline"
                title="Sem posts ainda"
                body={
                  isMe
                    ? "Compartilhe seu próximo treino pra aparecer aqui."
                    : "Quando essa pessoa postar, aparece aqui."
                }
              />
            ) : null}
          </View>
        }
        renderItem={({ item }) => <PostCard post={item} />}
      />
    </SafeAreaView>
  );
}

// Bloco de stats do atleta — treinos, sequencia, volume e exercicio favorito.
function StatsBlock({ stats }: { stats: ProfileStats }) {
  const items = [
    { label: "Treinos", value: String(stats.totalWorkouts) },
    {
      label: "Sequência",
      value: stats.weeklyStreak > 0 ? `${stats.weeklyStreak} sem` : "—",
    },
    { label: "Volume", value: fmtVolume(stats.totalVolumeKg) },
  ];
  return (
    <View className="mt-4">
      <View className="flex-row gap-2">
        {items.map((it) => (
          <View key={it.label} className="flex-1 bg-ink-900 border border-ink-800 rounded-2xl p-3">
            <Text className="text-chalk-faint text-[11px]">{it.label}</Text>
            <Text
              className="text-chalk text-lg font-extrabold mt-0.5"
              style={{ fontVariant: ["tabular-nums"] }}
            >
              {it.value}
            </Text>
          </View>
        ))}
      </View>
      {stats.favoriteExercise ? (
        <View className="flex-row items-center gap-2 bg-ink-900 border border-ink-800 rounded-2xl px-3 py-2.5 mt-2">
          <Ionicons name="flame-outline" size={15} color={colors.volt} />
          <Text className="text-chalk-muted text-xs" numberOfLines={1}>
            Mais treinado: <Text className="text-chalk font-semibold">{stats.favoriteExercise.name}</Text>
            {"  "}({stats.favoriteExercise.times}x)
          </Text>
        </View>
      ) : null}
    </View>
  );
}

// Rotina publica: nome + exercicios (expande) + botao copiar pra mim.
function RoutineCard({
  routine,
  canCopy,
  copying,
  onCopy,
}: {
  routine: { id: string; name: string; exercises: { name: string; targetSets: number; targetReps: number; targetWeight: number | null }[] };
  canCopy: boolean;
  copying: boolean;
  onCopy: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <View className="bg-ink-900 border border-ink-800 rounded-2xl overflow-hidden">
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityLabel={`Rotina ${routine.name}`}
        className="flex-row items-center px-4 py-3 active:bg-ink-850"
      >
        <View className="w-9 h-9 rounded-xl bg-ink-850 border border-ink-800 items-center justify-center mr-3">
          <Ionicons name="list-outline" size={17} color={colors.chalkMuted} />
        </View>
        <View className="flex-1">
          <Text className="text-chalk font-semibold" numberOfLines={1}>
            {routine.name}
          </Text>
          <Text className="text-chalk-faint text-xs mt-0.5">
            {routine.exercises.length} exercício{routine.exercises.length === 1 ? "" : "s"}
          </Text>
        </View>
        {canCopy ? (
          <Pressable
            onPress={() => {
              if (copied) return;
              onCopy();
              setCopied(true);
            }}
            disabled={copying || copied}
            accessibilityRole="button"
            accessibilityLabel={`Copiar ${routine.name}`}
            className={`px-3 py-1.5 rounded-lg border ${
              copied ? "bg-transparent border-ink-700" : "bg-volt border-volt"
            }`}
          >
            <Text className={`text-xs font-bold ${copied ? "text-chalk-muted" : "text-volt-on"}`}>
              {copied ? "Copiada" : "Copiar"}
            </Text>
          </Pressable>
        ) : (
          <Ionicons name={open ? "chevron-up" : "chevron-down"} size={16} color={colors.chalkFaint} />
        )}
      </Pressable>
      {open ? (
        <View className="px-4 pb-3 gap-1.5 border-t border-ink-850">
          {routine.exercises.map((e, i) => (
            <Text key={i} className="text-chalk-muted text-xs mt-1.5" numberOfLines={1}>
              {e.name} — {e.targetSets}x{e.targetReps}
              {e.targetWeight ? ` @ ${e.targetWeight}kg` : ""}
            </Text>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function FollowButton({
  isFollowing,
  isPending,
  busy,
  onPress,
}: {
  isFollowing: boolean;
  isPending: boolean;
  busy: boolean;
  onPress: () => void;
}) {
  const label = isFollowing ? "Seguindo" : isPending ? "Solicitado" : "Seguir";
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      className={`mt-4 py-3.5 rounded-xl items-center border ${
        isFollowing || isPending
          ? "bg-transparent border-ink-700"
          : "bg-volt border-volt"
      } ${busy ? "opacity-60" : ""}`}
    >
      <Text
        className={`font-bold ${isFollowing || isPending ? "text-chalk" : "text-volt-on"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      <View className="px-5 pt-2 pb-3 flex-row items-center gap-3">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          className="w-11 h-11 justify-center"
        >
          <Ionicons name="chevron-back" size={26} color={colors.chalk} />
        </Pressable>
        <Text className="text-chalk text-2xl font-extrabold tracking-tight flex-1">
          {title}
        </Text>
      </View>
      <View className="px-5">{children}</View>
    </SafeAreaView>
  );
}
