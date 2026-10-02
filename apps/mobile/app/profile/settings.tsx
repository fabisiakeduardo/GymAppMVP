import React, { useState } from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button } from "../../src/components/Button";
import { SectionTitle } from "../../src/components/ui";
import { useAuth } from "../../src/store/auth";
import { useBodyMetrics, useUpdateMe, useFollowRequests } from "../../src/api/hooks";
import { GOALS, GOAL_LABELS, type Goal } from "@gymapp/shared/constants";
import { colors } from "../../src/theme/colors";

type IconName = keyof typeof Ionicons.glyphMap;

// Configuracoes da conta — estilo Instagram: tudo que ajusta o perfil
// mora aqui, nao na tela publica do perfil.
export default function Settings() {
  const { user, logout, refreshMe } = useAuth();

  if (!user) return null;

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
          Configurações
        </Text>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-12">
        <SectionTitle>Conta</SectionTitle>
        <View className="gap-2">
          <LinkRow
            icon="create-outline"
            title="Editar perfil"
            sub="Nome, @, bio, foto, altura e descanso"
            onPress={() => router.push("/profile/edit")}
          />
          {/* Email: so exibe por enquanto — verificacao por codigo vem depois. */}
          <SettingsRow
            icon="mail-outline"
            title={user.email}
            sub={user.emailVerified ? "E-mail verificado" : "E-mail ainda não verificado"}
            right={
              user.emailVerified ? (
                <Ionicons name="checkmark-circle" size={18} color={colors.volt} />
              ) : (
                <View className="bg-ink-800 border border-ink-700 rounded-full px-2.5 py-1">
                  <Text className="text-chalk-faint text-[11px] font-semibold">em breve</Text>
                </View>
              )
            }
          />
          <LinkRow
            icon="lock-closed-outline"
            title="Alterar senha"
            sub="Troca a senha e desloga outros aparelhos"
            onPress={() => router.push("/profile/password")}
          />
        </View>

        <SectionTitle>Seu corpo</SectionTitle>
        <BodyLinks />

        <SectionTitle>Sua meta</SectionTitle>
        <GoalPicker current={user.goal} onChanged={refreshMe} />

        <SectionTitle>Privacidade</SectionTitle>
        <SocialPrivacy user={user} onChanged={refreshMe} />

        <SectionTitle>O que aparece no seu perfil</SectionTitle>
        <PublicProfileToggles user={user} onChanged={refreshMe} />

        <View className="mt-10">
          <Button label="Sair da conta" onPress={logout} variant="danger" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Linha generica: icone + titulo/sub + filho a direita (chevron, toggle...).
function SettingsRow({
  icon,
  title,
  sub,
  right,
  onPress,
  disabled,
  switchState,
}: {
  icon: IconName;
  title: string;
  sub: string;
  right: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  switchState?: { checked: boolean; busy: boolean };
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={switchState ? "switch" : "button"}
      accessibilityState={switchState}
      className="flex-row items-center bg-ink-900 border border-ink-800 rounded-2xl px-4 py-3.5 active:bg-ink-850"
    >
      <View className="w-9 h-9 rounded-xl bg-ink-850 border border-ink-800 items-center justify-center mr-3">
        <Ionicons name={icon} size={18} color={colors.chalkMuted} />
      </View>
      <View className="flex-1">
        <Text className="text-chalk font-semibold">{title}</Text>
        <Text className="text-chalk-faint text-xs mt-0.5">{sub}</Text>
      </View>
      {right}
    </Pressable>
  );
}

function LinkRow(props: {
  icon: IconName;
  title: string;
  sub: string;
  onPress: () => void;
  badge?: number;
}) {
  return (
    <SettingsRow
      {...props}
      right={
        props.badge ? (
          <View className="bg-volt rounded-full min-w-6 h-6 items-center justify-center px-1.5">
            <Text className="text-volt-on text-xs font-extrabold">{props.badge}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={colors.chalkFaint} />
        )
      }
    />
  );
}

// Toggle visual — mesmo desenho que ja existia no perfil.
function Switch({ on }: { on: boolean }) {
  return (
    <View
      className={`w-11 h-7 rounded-full justify-center px-0.5 ${on ? "bg-volt" : "bg-ink-700"}`}
    >
      <View
        className={`w-6 h-6 rounded-full ${on ? "bg-volt-on self-end" : "bg-chalk-faint self-start"}`}
      />
    </View>
  );
}

// Atalhos pras telas de corpo — mostra o ultimo peso registrado, se tiver.
function BodyLinks() {
  const { data: metrics } = useBodyMetrics();
  const lastWeight = metrics?.find((m) => m.weightKg !== null);

  return (
    <View className="gap-2">
      <LinkRow
        icon="scale-outline"
        title="Peso corporal"
        sub={lastWeight ? `${lastWeight.weightKg} kg` : "Registrar"}
        onPress={() => router.push("/body/weight")}
      />
      <LinkRow
        icon="resize-outline"
        title="Medidas"
        sub="Cintura, braço, coxa..."
        onPress={() => router.push("/body/measurements")}
      />
    </View>
  );
}

// Toggles do que outros usuarios veem no seu perfil publico.
function PublicProfileToggles({
  user,
  onChanged,
}: {
  user: { showRoutines: boolean; showStats: boolean; showBodyMetrics: boolean };
  onChanged: () => Promise<void>;
}) {
  const update = useUpdateMe();

  async function toggle(field: "showRoutines" | "showStats" | "showBodyMetrics", value: boolean) {
    try {
      await update.mutateAsync({ [field]: value });
      await onChanged();
    } catch {
      // o toggle simplesmente nao muda se falhar
    }
  }

  const items: {
    field: "showRoutines" | "showStats" | "showBodyMetrics";
    icon: IconName;
    title: string;
    sub: string;
    value: boolean;
  }[] = [
    {
      field: "showRoutines",
      icon: "list-outline",
      title: "Rotinas",
      sub: "Quem vê seu perfil pode ver e copiar suas rotinas",
      value: user.showRoutines,
    },
    {
      field: "showStats",
      icon: "stats-chart-outline",
      title: "Estatísticas",
      sub: "Treinos, sequência e volume no perfil público",
      value: user.showStats,
    },
    {
      field: "showBodyMetrics",
      icon: "scale-outline",
      title: "Medidas e peso",
      sub: "Último peso e gordura % — sensível, desligado por padrão",
      value: user.showBodyMetrics,
    },
  ];

  return (
    <View className="gap-2">
      {items.map((it) => (
        <SettingsRow
          key={it.field}
          icon={it.icon}
          title={it.title}
          sub={it.sub}
          onPress={() => toggle(it.field, !it.value)}
          disabled={update.isPending}
          switchState={{ checked: it.value, busy: update.isPending }}
          right={<Switch on={it.value} />}
        />
      ))}
    </View>
  );
}

// Privacidade da conta + fila de pedidos de seguidor.
function SocialPrivacy({
  user,
  onChanged,
}: {
  user: { isPrivate: boolean };
  onChanged: () => Promise<void>;
}) {
  const update = useUpdateMe();
  const { data: requests } = useFollowRequests();
  const pendingCount = requests?.length ?? 0;

  async function togglePrivate() {
    try {
      await update.mutateAsync({ isPrivate: !user.isPrivate });
      await onChanged();
    } catch {
      // o toggle simplesmente nao muda se falhar
    }
  }

  return (
    <View className="gap-2">
      <SettingsRow
        icon={user.isPrivate ? "lock-closed" : "lock-open-outline"}
        title="Perfil privado"
        sub={
          user.isPrivate
            ? "Só seguidores que você aprova veem seus posts"
            : "Qualquer pessoa pode ver seus posts"
        }
        onPress={togglePrivate}
        disabled={update.isPending}
        switchState={{ checked: user.isPrivate, busy: update.isPending }}
        right={<Switch on={user.isPrivate} />}
      />

      {user.isPrivate ? (
        <LinkRow
          icon="heart-outline"
          title="Pedidos de seguidor"
          sub={
            pendingCount > 0
              ? `${pendingCount} esperando aprovação — veja em Atividade`
              : "Aprovados na aba Atividade"
          }
          onPress={() => router.push("/social/activity")}
          badge={pendingCount}
        />
      ) : null}
    </View>
  );
}

function GoalPicker({ current, onChanged }: { current: Goal; onChanged: () => Promise<void> }) {
  const [saving, setSaving] = useState<Goal | null>(null);
  const update = useUpdateMe();

  async function pick(goal: Goal) {
    if (goal === current) return;
    setSaving(goal);
    try {
      await update.mutateAsync({ goal });
      await onChanged();
    } finally {
      setSaving(null);
    }
  }

  return (
    <View className="flex-row gap-2">
      {GOALS.map((g) => {
        const active = g === current;
        return (
          <Pressable
            key={g}
            onPress={() => pick(g)}
            disabled={saving !== null}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            className={`flex-1 py-3.5 rounded-xl items-center border ${
              active ? "bg-volt border-volt" : "bg-ink-900 border-ink-800 active:bg-ink-850"
            } ${saving === g ? "opacity-60" : ""}`}
          >
            <Text className={`font-bold text-sm ${active ? "text-volt-on" : "text-chalk"}`}>
              {GOAL_LABELS[g]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
