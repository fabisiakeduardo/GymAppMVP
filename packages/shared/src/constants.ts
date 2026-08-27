// Valores de dominio compartilhados entre app e api.

export const GOALS = ["cut", "bulk", "maintain"] as const;
export type Goal = (typeof GOALS)[number];

// Rotulos em pt-BR pra UI. A logica usa os enums acima.
export const GOAL_LABELS: Record<Goal, string> = {
  cut: "Cutting",
  bulk: "Bulking",
  maintain: "Manutencao",
};

export const MUSCLE_GROUPS = [
  "peito",
  "costas",
  "pernas",
  "ombro",
  "biceps",
  "triceps",
  "abdomen",
  "gluteo",
  "panturrilha",
  "antebraco",
  "corpo_todo",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT = [
  "barra",
  "halter",
  "maquina",
  "cabo",
  "peso_corporal",
  "kettlebell",
  "outro",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];
