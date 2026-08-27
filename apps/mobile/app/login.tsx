import React, { useState } from "react";
import { View, Text, TextInput, Pressable, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Button } from "../src/components/Button";
import { ErrorText } from "../src/components/ui";
import { useAuth } from "../src/store/auth";
import { colors } from "../src/theme/colors";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (!email.includes("@")) return setError("Email inválido.");
    if (!password) return setError("Coloca tua senha.");
    setError(null);
    setLoading(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
      router.back();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Não deu pra entrar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-ink-950">
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <View className="flex-1 px-6 pt-10">
          <Text className="text-chalk text-3xl font-extrabold tracking-tight">Bem-vindo de volta</Text>
          <Text className="text-chalk-muted text-base mt-1 mb-8">Bora pro treino.</Text>

          <View className="mb-4">
            <Text className="text-chalk-faint text-xs mb-1">Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="voce@email.com"
              placeholderTextColor={colors.chalkFaint}
              keyboardType="email-address"
              autoCapitalize="none"
              accessibilityLabel="Email"
              className="bg-ink-900 border border-ink-800 rounded-xl px-3 py-3 text-chalk text-base"
              style={{ color: colors.chalk }}
            />
          </View>
          <View className="mb-6">
            <Text className="text-chalk-faint text-xs mb-1">Senha</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="tua senha"
              placeholderTextColor={colors.chalkFaint}
              secureTextEntry
              accessibilityLabel="Senha"
              className="bg-ink-900 border border-ink-800 rounded-xl px-3 py-3 text-chalk text-base"
              style={{ color: colors.chalk }}
            />
          </View>

          <ErrorText message={error} />
          <Button label="Entrar" onPress={submit} loading={loading} large />

          <Pressable onPress={() => router.replace("/register")} className="py-4 mt-2">
            <Text className="text-chalk-muted text-center">
              Novo por aqui? <Text className="text-volt font-semibold">Criar conta</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
