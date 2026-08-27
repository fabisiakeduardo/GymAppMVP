import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";
import type { LiveSet } from "../live/model";
import type { LastPerformance } from "../live/lastTime";

interface SetRowProps {
  set: LiveSet;
  lastTime: LastPerformance | null;
  onComplete: (values: { weight: number; reps: number }) => void;
  onEdit: (values: { weight?: number; reps?: number }) => void;
}

// Linha de UMA serie. Campo grande de carga/reps (teclado numerico) e um botao
// gigante pra marcar feita com um toque — pensado pra usar com uma mao so.
export function SetRow({ set, lastTime, onComplete, onEdit }: SetRowProps) {
  const [weight, setWeight] = useState(set.weight ? String(set.weight) : "");
  const [reps, setReps] = useState(set.reps ? String(set.reps) : "");

  function handleComplete() {
    const w = parseFloat(weight.replace(",", ".")) || 0;
    const r = parseInt(reps, 10) || 0;
    onComplete({ weight: w, reps: r });
  }

  const done = set.completed;

  return (
    <View
      className={`flex-row items-center gap-2 py-2 px-2 rounded-xl ${done ? "bg-volt/10" : ""}`}
      accessibilityLabel={`Série ${set.setNumber}${done ? ", feita" : ""}`}
    >
      <View className="w-8 items-center">
        <Text className={`text-lg font-extrabold ${done ? "text-volt" : "text-chalk-muted"}`}>
          {set.setNumber}
        </Text>
      </View>

      <View className="flex-1">
        {lastTime ? (
          <Text className="text-chalk-faint text-xs mb-1">
            última vez: {lastTime.weight} kg × {lastTime.reps}
          </Text>
        ) : (
          <Text className="text-chalk-faint text-xs mb-1">primeira vez nesse peso</Text>
        )}
        <View className="flex-row gap-2">
          <Field
            value={weight}
            onChangeText={(t) => {
              setWeight(t);
              onEdit({ weight: parseFloat(t.replace(",", ".")) || 0 });
            }}
            suffix="kg"
            label="Carga"
          />
          <Field
            value={reps}
            onChangeText={(t) => {
              setReps(t);
              onEdit({ reps: parseInt(t, 10) || 0 });
            }}
            suffix="reps"
            label="Reps"
          />
        </View>
      </View>

      <Pressable
        onPress={handleComplete}
        accessibilityRole="button"
        accessibilityLabel={done ? `Desmarcar série ${set.setNumber}` : `Marcar série ${set.setNumber} como feita`}
        accessibilityState={{ selected: done }}
        className={`w-14 h-14 rounded-2xl items-center justify-center ${
          done ? "bg-volt" : "bg-ink-800 border border-ink-700 active:bg-ink-700"
        }`}
      >
        <Ionicons
          name={done ? "checkmark-sharp" : "checkmark"}
          size={28}
          color={done ? colors.voltOn : colors.chalkFaint}
        />
      </Pressable>
    </View>
  );
}

function Field({
  value,
  onChangeText,
  suffix,
  label,
}: {
  value: string;
  onChangeText: (t: string) => void;
  suffix: string;
  label: string;
}) {
  return (
    <View className="flex-1 bg-ink-800 border border-ink-700 rounded-xl px-3 py-2 flex-row items-baseline">
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor={colors.chalkFaint}
        accessibilityLabel={label}
        className="text-chalk text-2xl font-bold flex-1 p-0"
        style={{ color: colors.chalk }}
      />
      <Text className="text-chalk-faint text-xs ml-1">{suffix}</Text>
    </View>
  );
}
