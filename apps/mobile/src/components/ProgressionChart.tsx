import React from "react";
import { View, Text } from "react-native";
import Svg, { Polyline, Circle, Line } from "react-native-svg";
import { colors } from "../theme/colors";
import type { ProgressionPoint } from "../api/types";

// Grafico de linha simples da progressao de carga. Sem lib pesada: SVG puro.
export function ProgressionChart({ points }: { points: ProgressionPoint[] }) {
  const width = 320;
  const height = 180;
  const pad = 24;

  if (points.length < 2) {
    return (
      <View className="h-44 items-center justify-center">
        <Text className="text-chalk-faint text-sm text-center">
          Conclua outro treino com este exercício para ver a progressão.
        </Text>
      </View>
    );
  }

  const weights = points.map((p) => p.topWeight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const x = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const y = (w: number) => height - pad - ((w - min) / range) * (height - pad * 2);

  const coords = points.map((p, i) => `${x(i)},${y(p.topWeight)}`).join(" ");

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* base */}
        <Line x1={pad} y1={height - pad} x2={width - pad} y2={height - pad} stroke={colors.ink700} strokeWidth={1} />
        <Polyline points={coords} fill="none" stroke={colors.volt} strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" />
        {points.map((p, i) => (
          <Circle key={i} cx={x(i)} cy={y(p.topWeight)} r={4} fill={colors.volt} />
        ))}
      </Svg>
      <View className="flex-row justify-between mt-1 px-1">
        <Text className="text-chalk-faint text-xs">{min} kg</Text>
        <Text className="text-chalk-faint text-xs">{max} kg</Text>
      </View>
    </View>
  );
}
