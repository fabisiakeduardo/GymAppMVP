import React from "react";
import { View, Text, Pressable, Modal } from "react-native";

export interface ActionSheetOption {
  label: string;
  destructive?: boolean;
  onPress: () => void;
}

// Menu de acoes em bottom sheet — substitui Alert.alert com varios botoes,
// que e no-op na web (react-native-web nao implementa Alert).
export function ActionSheet({
  visible,
  title,
  message,
  options,
  onClose,
}: {
  visible: boolean;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 bg-black/60 justify-end"
        onPress={onClose}
        accessibilityLabel="Fechar menu"
      >
        <Pressable className="bg-ink-900 border-t border-ink-800 rounded-t-3xl p-4 pb-8" onPress={() => {}}>
          {title ? (
            <Text className="text-chalk-faint text-sm text-center font-semibold">{title}</Text>
          ) : null}
          {message ? (
            <Text className="text-chalk-muted text-[15px] text-center mt-1 mb-3">{message}</Text>
          ) : title ? (
            <View className="mb-3" />
          ) : null}
          <View className="gap-2">
            {options.map((opt) => (
              <Pressable
                key={opt.label}
                onPress={() => {
                  onClose();
                  opt.onPress();
                }}
                accessibilityRole="button"
                className={`py-4 rounded-xl items-center ${
                  opt.destructive ? "bg-blood/10 border border-blood/40" : "bg-ink-850 border border-ink-800 active:bg-ink-800"
                }`}
              >
                <Text className={`font-bold ${opt.destructive ? "text-blood" : "text-chalk"}`}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
            <Pressable
              onPress={onClose}
              accessibilityRole="button"
              className="py-4 rounded-xl items-center active:bg-ink-850"
            >
              <Text className="text-chalk-faint font-semibold">Cancelar</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
