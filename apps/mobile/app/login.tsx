import React, { useState } from "react";
import { View, Text, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button } from "../src/components/Button";
import { Field, ErrorText } from "../src/components/ui";
import { useAuth } from "../src/store/auth";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.includes("@")) return setError("E-mail inválido.");
    if (!password) return setError("Informe sua senha.");
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      // Modal pode nao ter historico pra voltar (replace) — navega direto.
      router.replace("/(tabs)/perfil");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="flex-1 px-6 pt-16">
          <Text className="text-volt text-sm font-extrabold tracking-[3px] mb-6">MAROMBA</Text>
          <Text className="text-chalk text-[34px] leading-10 font-extrabold tracking-tighter">
            Bem-vindo de volta
          </Text>
          <Text className="text-chalk-muted text-[15px] mt-1 mb-10">
            Entre para continuar seus treinos.
          </Text>

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
            placeholder="Sua senha"
            password
          />

          <ErrorText message={error} />
          <View className="mt-2">
            <Button label="Entrar" onPress={submit} loading={loading} large />
          </View>

          <Pressable onPress={() => router.replace("/register")} className="py-4 mt-2">
            <Text className="text-chalk-muted text-center">
              Ainda não tem conta? <Text className="text-volt font-semibold">Criar conta</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
