import React, { useState } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button } from "../src/components/Button";
import { Field, ErrorText } from "../src/components/ui";
import { useAuth } from "../src/store/auth";
import { GOALS, GOAL_LABELS, type Goal } from "@gymapp/shared/constants";

export default function Register() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [goal, setGoal] = useState<Goal>("maintain");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (name.trim().length < 1) return setError("Informe seu nome.");
    if (!email.includes("@")) return setError("E-mail inválido.");
    if (password.length < 8) return setError("A senha precisa de pelo menos 8 caracteres.");
    setError(null);
    setLoading(true);
    try {
      await register({ email: email.trim().toLowerCase(), password, name: name.trim(), goal });
      // Modal pode nao ter historico pra voltar (replace) — navega direto.
      router.replace("/(tabs)/perfil");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView contentContainerClassName="px-6 pt-10 pb-8" keyboardShouldPersistTaps="handled">
          <Text className="text-volt text-sm font-extrabold tracking-[3px] mb-6">MAROMBA</Text>
          <Text className="text-chalk text-[34px] leading-10 font-extrabold tracking-tighter">
            Crie sua conta
          </Text>
          <Text className="text-chalk-muted text-[15px] mt-1 mb-8">
            Seu histórico e seus recordes sempre salvos.
          </Text>

          <Field label="Nome" value={name} onChangeText={setName} placeholder="Seu nome" />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="seu@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Senha"
            value={password}
            onChangeText={setPassword}
            placeholder="Mínimo de 8 caracteres"
            secureTextEntry
          />

          <Text className="text-chalk-faint text-[13px] mb-1.5 mt-1">Sua meta</Text>
          <View className="flex-row gap-2 mb-6">
            {GOALS.map((g) => {
              const active = g === goal;
              return (
                <Pressable
                  key={g}
                  onPress={() => setGoal(g)}
                  accessibilityState={{ selected: active }}
                  className={`flex-1 py-3.5 rounded-xl items-center border ${
                    active ? "bg-volt border-volt" : "bg-ink-900 border-ink-800 active:bg-ink-850"
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
              Já possui conta? <Text className="text-volt font-semibold">Entrar</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
