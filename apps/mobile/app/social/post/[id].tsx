import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "../../../src/components/Avatar";
import { PostCard, timeAgo } from "../../../src/components/PostCard";
import { EmptyState, SkeletonRows } from "../../../src/components/ui";
import { useAuth } from "../../../src/store/auth";
import { usePost, useComments, useAddComment, useDeleteComment } from "../../../src/api/hooks";
import { colors } from "../../../src/theme/colors";
import type { PostComment } from "../../../src/api/types";

// Detalhe do post: card completo + thread de comentarios + campo pra comentar.
export default function PostDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { data: post, isLoading } = usePost(id ?? "");
  const { data: comments } = useComments(id ?? "");
  const addComment = useAddComment(id ?? "");
  const deleteComment = useDeleteComment(id ?? "");
  const [draft, setDraft] = useState("");

  async function send() {
    const body = draft.trim();
    if (!body) return;
    setDraft("");
    await addComment.mutateAsync(body).catch(() => setDraft(body));
  }

  if (isLoading) {
    return (
      <Shell title="Post">
        <SkeletonRows count={3} />
      </Shell>
    );
  }
  if (!post) {
    return (
      <Shell title="Post">
        <EmptyState
          icon="eye-off-outline"
          title="Post não encontrado"
          body="Pode ter sido apagado ou o perfil é privado."
        />
      </Shell>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-950" edges={["top", "left", "right"]}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View className="px-5 pt-2 pb-3 flex-row items-center gap-3">
          <Pressable
            onPress={() => router.back()}
            accessibilityLabel="Voltar"
            className="w-11 h-11 justify-center"
          >
            <Ionicons name="chevron-back" size={26} color={colors.chalk} />
          </Pressable>
          <Text className="text-chalk text-2xl font-extrabold tracking-tight flex-1">
            Post
          </Text>
        </View>

        <FlatList
          data={comments ?? []}
          keyExtractor={(c) => c.id}
          contentContainerClassName="px-5 pb-6"
          ListHeaderComponent={
            <PostCard post={post} onDeleted={() => router.back()} />
          }
          ListEmptyComponent={
            <Text className="text-chalk-faint text-sm text-center py-6">
              Seja o primeiro a comentar.
            </Text>
          }
          renderItem={({ item }) => (
            <CommentRow
              comment={item}
              canDelete={item.isMine || post.author.id === user?.id}
              onDelete={() => deleteComment.mutate(item.id)}
            />
          )}
        />

        {/* Campo de comentario fixado embaixo */}
        <View className="flex-row items-center gap-2 px-5 py-3 border-t border-ink-850 bg-ink-950">
          <Avatar uri={user?.avatarUrl} name={user?.name ?? "?"} size={32} />
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Escreve um comentário…"
            placeholderTextColor={colors.chalkFaint}
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={send}
            accessibilityLabel="Escrever comentario"
            className="flex-1 bg-ink-900 border border-ink-800 rounded-full px-4 py-2.5 text-chalk text-[15px]"
            style={{ color: colors.chalk }}
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim() || addComment.isPending}
            accessibilityRole="button"
            accessibilityLabel="Enviar comentario"
            className={`w-10 h-10 rounded-full items-center justify-center ${
              draft.trim() ? "bg-volt" : "bg-ink-850"
            }`}
          >
            <Ionicons
              name="send"
              size={16}
              color={draft.trim() ? colors.voltOn : colors.chalkFaint}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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

function CommentRow({
  comment,
  canDelete,
  onDelete,
}: {
  comment: PostComment;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <View className="flex-row gap-2.5 py-3 border-b border-ink-850">
      <Pressable onPress={() => router.push(`/social/user/${comment.user.id}`)}>
        <Avatar uri={comment.user.avatarUrl} name={comment.user.name} size={32} />
      </Pressable>
      <View className="flex-1">
        <View className="flex-row items-baseline gap-2">
          <Text className="text-chalk font-semibold text-sm">{comment.user.name}</Text>
          <Text className="text-chalk-faint text-[11px]">{timeAgo(comment.createdAt)}</Text>
        </View>
        <Text className="text-chalk text-[15px] leading-6 mt-0.5">{comment.body}</Text>
      </View>
      {canDelete ? (
        confirm ? (
          <View className="flex-row gap-1 items-center">
            <Pressable onPress={onDelete} accessibilityLabel="Confirmar apagar comentario">
              <Text className="text-blood text-xs font-bold">Apagar</Text>
            </Pressable>
            <Pressable onPress={() => setConfirm(false)} accessibilityLabel="Cancelar">
              <Text className="text-chalk-faint text-xs px-1">Não</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            onPress={() => setConfirm(true)}
            accessibilityLabel="Apagar comentario"
            className="p-1"
          >
            <Ionicons name="trash-outline" size={14} color={colors.chalkFaint} />
          </Pressable>
        )
      ) : null}
    </View>
  );
}
