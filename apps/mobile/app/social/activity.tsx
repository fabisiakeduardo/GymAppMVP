import React, { useEffect } from "react";
import { View, Text, FlatList, Pressable, RefreshControl } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../src/components/Avatar";
import {
  useNotifications,
  useMarkNotificationsRead,
  useAcceptFollow,
  useDeclineFollow,
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

const ICONS: Record<NotificationType, keyof typeof Ionicons.glyphMap> = {
  follow: "person-add",
  follow_request: "person-add-outline",
  follow_accepted: "checkmark-circle",
  like: "heart",
  comment: "chatbubble",
  story_like: "heart-circle",
};

export default function ActivityScreen() {
  const { data: notifications = [], isLoading, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationsRead();
  const accept = useAcceptFollow();
  const decline = useDeclineFollow();

  // Abrir a tela marca tudo como lido (zera o badge do feed).
  useEffect(() => {
    markRead.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToTarget(n: AppNotification) {
    if (n.postId) {
      router.push(`/social/post/${n.postId}`);
      return;
    }
    router.push(`/social/user/${n.actor.id}`);
  }

  return (
    <View className="flex-1 bg-ink-950">
      <View className="flex-row items-center px-5 pt-14 pb-4 border-b border-ink-850">
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          className="w-10 h-10 items-center justify-center -ml-2"
        >
          <Ionicons name="chevron-back" size={22} color={colors.chalk} />
        </Pressable>
        <Text className="text-chalk text-xl font-black ml-1">Atividade</Text>
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(n) => n.id}
        contentContainerClassName="px-5 pb-10"
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.volt}
          />
        }
        ListEmptyComponent={
          <View className="items-center pt-20 gap-3">
            <Ionicons name="heart-outline" size={40} color={colors.chalkFaint} />
            <Text className="text-chalk-muted text-sm">
              {isLoading ? "Carregando…" : "Nada por aqui ainda — quando alguém te seguir ou curtir, aparece aqui."}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => goToTarget(item)}
            className={`flex-row items-center gap-3 py-3 border-b border-ink-850 ${
              item.seen ? "" : "bg-ink-900/60 -mx-5 px-5"
            }`}
          >
            <Avatar uri={item.actor.avatarUrl} name={item.actor.name} size={44} />
            <View className="flex-1">
              <Text className="text-chalk text-[14px] leading-5">
                <Text className="font-bold">{item.actor.name}</Text>{" "}
                <Text className="text-chalk-muted">{COPY[item.type]}</Text>
              </Text>
              <Text className="text-chalk-faint text-xs mt-0.5">{timeAgo(item.createdAt)}</Text>
            </View>

            {item.type === "follow_request" && item.requestPending ? (
              <View className="flex-row gap-2">
                <Pressable
                  onPress={() => accept.mutate(item.actor.id)}
                  disabled={accept.isPending || decline.isPending}
                  className="bg-volt px-3 py-1.5 rounded-lg"
                  accessibilityLabel={`Aceitar ${item.actor.name}`}
                >
                  <Text className="text-ink-950 text-xs font-bold">Aceitar</Text>
                </Pressable>
                <Pressable
                  onPress={() => decline.mutate(item.actor.id)}
                  disabled={accept.isPending || decline.isPending}
                  className="bg-ink-800 px-3 py-1.5 rounded-lg border border-ink-700"
                  accessibilityLabel={`Recusar ${item.actor.name}`}
                >
                  <Text className="text-chalk-muted text-xs font-bold">Recusar</Text>
                </Pressable>
              </View>
            ) : (
              <Ionicons
                name={ICONS[item.type]}
                size={18}
                color={item.type === "like" || item.type === "story_like" ? colors.blood : colors.chalkFaint}
              />
            )}
          </Pressable>
        )}
      />
    </View>
  );
}
