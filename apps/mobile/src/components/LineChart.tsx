import React from "react";
import { View, Text } from "react-native";
import Svg, { Polyline, Circle, Line } from "react-native-svg";
import { colors } from "../theme/colors";

export interface ChartPoint {
  label: string; // texto curto do eixo X (ex: "12/03")
  value: number;
}

// Grafico de linha generico em SVG puro — usado por peso corporal e
// progressao de carga. Recebe pontos na ordem cronologica.
export function LineChart({
  points,
  unit = "kg",
  emptyHint,
  height = 160,
}: {
  points: ChartPoint[];
  unit?: string;
  emptyHint?: string;
  height?: number;
}) {
  const width = 320;
  const pad = 24;

  if (points.length < 2) {
    return (
      <View style={{ height }} className="items-center justify-center">
        <Text className="text-chalk-faint text-sm text-center px-4">
          {emptyHint ?? "Registre mais uma vez para ver a evolução."}
        </Text>
      </View>
    );
  }

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const x = (i: number) => pad + (i / (points.length - 1)) * (width - pad * 2);
  const y = (v: number) => height - pad - ((v - min) / range) * (height - pad * 2);

  const coords = points.map((p, i) => `${x(i)},${y(p.value)}`).join(" ");

  return (
    <View>
      <Svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <Line
          x1={pad}
          y1={height - pad}
          x2={width - pad}
          y2={height - pad}
          stroke={colors.ink700}
          strokeWidth={1}
        />
        <Polyline
          points={coords}
          fill="none"
          stroke={colors.volt}
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <Circle key={i} cx={x(i)} cy={y(p.value)} r={4} fill={colors.volt} />
        ))}
      </Svg>
      <View className="flex-row justify-between mt-1 px-1">
        <Text className="text-chalk-faint text-xs">
          {min} {unit}
        </Text>
        <Text className="text-chalk-faint text-xs">
          {max} {unit}
        </Text>
      </View>
      <View className="flex-row justify-between px-1">
        <Text className="text-chalk-faint text-[11px]">{points[0]!.label}</Text>
        <Text className="text-chalk-faint text-[11px]">{points[points.length - 1]!.label}</Text>
      </View>
    </View>
  );
}
