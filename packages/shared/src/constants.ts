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

// Medidas corporais (cm) registradas em body_metrics.measurements.
export const MEASUREMENT_KEYS = [
  "peito",
  "cintura",
  "quadril",
  "braco_direito",
  "braco_esquerdo",
  "coxa_direita",
  "coxa_esquerda",
  "panturrilha",
  "pescoco",
] as const;
export type MeasurementKey = (typeof MEASUREMENT_KEYS)[number];

export const MEASUREMENT_LABELS: Record<MeasurementKey, string> = {
  peito: "Peito",
  cintura: "Cintura",
  quadril: "Quadril",
  braco_direito: "Braço dir.",
  braco_esquerdo: "Braço esq.",
  coxa_direita: "Coxa dir.",
  coxa_esquerda: "Coxa esq.",
  panturrilha: "Panturrilha",
  pescoco: "Pescoço",
};
