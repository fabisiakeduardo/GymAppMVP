import React, { useEffect, useMemo } from "react";
import { View, Text, SectionList, Pressable, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../src/components/Avatar";
import { EmptyState, SkeletonRows } from "../../src/components/ui";
import { FadeInView, staggerDelay } from "../../src/components/anim";
import {
  useNotifications,
  useMarkNotificationsRead,
  useAcceptFollow,
  useDeclineFollow,
  useFollowRequests,
} from "../../src/api/hooks";
import { timeAgo } from "../../src/components/PostCard";
import { colors } from "../../src/theme/colors";
import type { AppNotification, NotificationType } from "../../src/api/types";

// Texto por tipo — estilo Instagram ("X comecou a te seguir").
const COPY: Record<NotificationType, string> = {
  follow: "começou a te seguir",
  follow_request: "pediu pra te seguir",
  follow_accepted: "aceitou seu pedido pra seguir",
  like: "curtiu seu post",
  comment: "comentou no seu post",
  story_like: "curtiu seu story",
};

// Badge do tipo sobre o avatar — o icone diz a acao sem competir com o texto.
const BADGES: Record<
  NotificationType,
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  follow: { icon: "person-add", color: colors.chalkMuted },
  follow_request: { icon: "person-add", color: colors.volt },
  follow_accepted: { icon: "checkmark", color: colors.volt },
  like: { icon: "heart", color: colors.blood },
  comment: { icon: "chatbubble", color: colors.chalkMuted },
  story_like: { icon: "heart", color: colors.blood },
};

type Row =
  | { kind: "notification"; n: AppNotification }
  | { kind: "requests"; count: number };

// Agrupa notificacoes em baldes estilo IG: Hoje / Esta semana / Anteriores.
function bucketOf(iso: string): string {
  const created = new Date(iso).getTime();
  const dayMs = 86_400_000;
  const startOfToday = new Date().setHours(0, 0, 0, 0);
  if (created >= startOfToday) return "Hoje";
  if (Date.now() - created < 7 * dayMs) return "Esta semana";
  return "Anteriores";
}

export default function ActivityScreen() {
  const { data: notifications = [], isLoading, refetch, isRefetching } = useNotifications();
  const { data: requests } = useFollowRequests();
  const markRead = useMarkNotificationsRead();
  const accept = useAcceptFollow();
  const decline = useDeclineFollow();

  const pendingCount = requests?.length ?? 0;

  // Abrir a tela marca tudo como lido (zera o badge do feed).
  useEffect(() => {
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = useMemo(() => {
    const order = ["Hoje", "Esta semana", "Anteriores"];
    const groups = new Map<string, Row[]>();
    for (const n of notifications) {
      const b = bucketOf(n.createdAt);
      const arr = groups.get(b) ?? [];
      arr.push({ kind: "notification", n });
      groups.set(b, arr);
    }
    const list = order
      .filter((k) => groups.has(k))
      .map((k) => ({ title: k, data: groups.get(k)! }));

    // Pedidos pendentes ficam pinados no topo da primeira secao.
    if (pendingCount > 0) {
      const row: Row = { kind: "requests", count: pendingCount };
      if (list.length > 0) list[0].data = [row, ...list[0].data];
      else list.push({ title: "Agora", data: [row] });
    }
    return list;
  }, [notifications, pendingCount]);

  function goToTarget(n: AppNotification) {
    if (n.postId) {
      router.push(`/social/post/${n.postId}`);
      return;
    }
    if (n.storyId) {
      router.push(`/social/story/${n.storyId}`);
      return;
    }
    router.push(`/social/user/${n.actor.id}`);
  }

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
          Atividade
        </Text>
      </View>

      {isLoading ? (
        <View className="px-5">
          <SkeletonRows count={5} />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => (item.kind === "notification" ? item.n.id : "requests")}
          contentContainerClassName="px-5 pb-10"
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={colors.volt}
            />
          }
          renderSectionHeader={({ section }) => (
            <Text className="text-chalk-faint text-[13px] font-semibold tracking-wide mt-4 mb-1">
              {section.title}
            </Text>
          )}
          ListEmptyComponent={
            <EmptyState
              icon="heart-outline"
              title="Nada por aqui ainda"
              body="Quando alguém te seguir, curtir ou comentar, aparece aqui."
            />
          }
          renderItem={({ item, index }) =>
            item.kind === "requests" ? (
              <RequestsBanner count={item.count} />
            ) : (
              <FadeInView delay={staggerDelay(index)}>
                <NotificationRow
                  n={item.n}
                  busy={accept.isPending || decline.isPending}
                  onPress={() => goToTarget(item.n)}
                  onAccept={() => accept.mutate(item.n.actor.id)}
                  onDecline={() => decline.mutate(item.n.actor.id)}
                />
              </FadeInView>
            )
          }
        />
      )}
    </SafeAreaView>
  );
}

// Banner pinado: "3 pedidos de seguidor" -> tela de aprovacao.
function RequestsBanner({ count }: { count: number }) {
  return (
    <Pressable
      onPress={() => router.push("/social/requests")}
      accessibilityRole="button"
      accessibilityLabel={`${count} pedidos de seguidor`}
      className="flex-row items-center gap-3 bg-volt-wash border border-volt/30 rounded-2xl px-4 py-3.5 mt-1 mb-2 active:opacity-80"
    >
      <View className="w-9 h-9 rounded-xl bg-volt items-center justify-center">
        <Ionicons name="person-add" size={17} color={colors.voltOn} />
      </View>
      <View className="flex-1">
        <Text className="text-chalk font-semibold">
          {count} pedido{count === 1 ? "" : "s"} de seguidor
        </Text>
        <Text className="text-chalk-muted text-xs mt-0.5">Toque pra aprovar ou recusar</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.chalkFaint} />
    </Pressable>
  );
}

function NotificationRow({
  n,
  busy,
  onPress,
  onAccept,
  onDecline,
}: {
  n: AppNotification;
  busy: boolean;
  onPress: () => void;
  onAccept: () => void;
  onDecline: () => void;
}) {
  const badge = BADGES[n.type];

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 py-3 border-b border-ink-850 ${
        n.seen ? "" : "bg-ink-900/60 -mx-5 px-5"
      }`}
    >
      <View>
        <Avatar uri={n.actor.avatarUrl} name={n.actor.name} size={44} />
        {/* Badge do tipo: canto inferior direito do avatar, estilo IG */}
        <View className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-ink-900 border border-ink-800 items-center justify-center">
          <Ionicons name={badge.icon} size={11} color={badge.color} />
        </View>
      </View>

      <View className="flex-1">
        <Text className="text-chalk text-[14px] leading-5">
          <Text className="font-bold">{n.actor.name}</Text>{" "}
          <Text className="text-chalk-muted">{COPY[n.type]}</Text>
        </Text>
        <Text className="text-chalk-faint text-xs mt-0.5">{timeAgo(n.createdAt)}</Text>
      </View>

      {n.type === "follow_request" && n.requestPending ? (
        <View className="flex-row gap-2">
          <Pressable
            onPress={onAccept}
            disabled={busy}
            className={`bg-volt px-3 py-1.5 rounded-lg ${busy ? "opacity-60" : ""}`}
            accessibilityRole="button"
            accessibilityLabel={`Aceitar ${n.actor.name}`}
          >
            <Text className="text-volt-on text-xs font-bold">Aceitar</Text>
          </Pressable>
          <Pressable
            onPress={onDecline}
            disabled={busy}
            className={`bg-ink-800 px-3 py-1.5 rounded-lg border border-ink-700 ${busy ? "opacity-60" : ""}`}
            accessibilityRole="button"
            accessibilityLabel={`Recusar ${n.actor.name}`}
          >
            <Text className="text-chalk-muted text-xs font-bold">Recusar</Text>
          </Pressable>
        </View>
      ) : !n.seen ? (
        <View className="w-2 h-2 rounded-full bg-volt" />
      ) : null}
    </Pressable>
  );
}
