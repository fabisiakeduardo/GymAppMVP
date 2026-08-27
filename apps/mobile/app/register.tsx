import React, { useState } from "react";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button } from "../src/components/Button";
import { ErrorText } from "../src/components/ui";
import { useAuth } from "../src/store/auth";
import { GOALS, GOAL_LABELS, type Goal } from "@gymapp/shared";
import { colors } from "../src/theme/colors";

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (name.trim().length < 1) return setError("Coloca teu nome.");
    if (!email.includes("@")) return setError("Email inválido.");
    if (password.length < 8) return setError("Senha de pelo menos 8 caracteres.");
    setError(null);
    setLoading(true);
    try {
      await register({ email: email.trim().toLowerCase(), password, name: name.trim(), goal });
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não deu pra criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="flex-1 px-6 pt-8">
          <Text className="text-chalk text-3xl font-extrabold tracking-tight">Cria tua conta</Text>
          <Text className="text-chalk-muted text-base mt-1 mb-8">
            Pra teu histórico e teus PRs nunca sumirem.
          </Text>

          <Input label="Nome" value={name} onChangeText={setName} placeholder="Como te chamam" />
          <Input
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Input
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="mín. 8 caracteres"
            secureTextEntry
          />

          <Text className="text-chalk-faint text-xs mb-2 mt-2">Sua meta</Text>
          <View className="flex-row gap-2 mb-6">
            {GOALS.map((g) => {
              const active = g === goal;
              return (
                <Pressable
                  key={g}
                  onPress={() => setGoal(g)}
                  accessibilityState={{ selected: active }}
                  className={`flex-1 py-3 rounded-xl items-center border ${
                    active ? "bg-volt border-volt" : "bg-ink-900 border-ink-800"
                  }`}
                >
                  <Text className={`font-bold text-sm ${active ? "text-volt-on" : "text-chalk"}`}>
                    {GOAL_LABELS[g]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <ErrorText message={error} />
          <Button label="Criar conta" onPress={submit} loading={loading} large />

          <Pressable onPress={() => router.replace("/login")} className="py-4 mt-2">
            <Text className="text-chalk-muted text-center">
              Já tem conta? <Text className="text-volt font-semibold">Entrar</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Input({
  label,
  ...props
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address";
  autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View className="mb-4">
      <Text className="text-chalk-faint text-xs mb-1">{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={colors.chalkFaint}
        accessibilityLabel={label}
        className="bg-ink-900 border border-ink-800 rounded-xl px-3 py-3 text-chalk text-base"
        style={{ color: colors.chalk }}
      />
    </View>
  );
}
