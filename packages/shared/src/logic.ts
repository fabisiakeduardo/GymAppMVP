// Logica de PR e progressao. Vive no pacote compartilhado pra ter uma unica
// fonte de verdade: a API calcula em cima do banco e os testes cobrem aqui.

export interface SetRecord {
  exerciseId: string;
  reps: number;
  weight: number;
  completed: boolean;
  performedAt: string | Date;
}

// Epley: estimativa de 1RM. Boa o suficiente pra comparar progressao.
export function estimate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export interface ExercisePR {
  exerciseId: string;
  maxWeight: number; // maior carga em uma serie
  maxWeightReps: number; // reps feitas naquela carga
  bestE1RM: number; // maior 1RM estimado
  maxVolumeSet: number; // maior volume (carga x reps) numa serie
  achievedAt: string; // ISO da serie que fez o PR de carga
}

// Um PR por exercicio, calculado a partir das series completadas.
export function computePRs(sets: SetRecord[]): ExercisePR[] {
  const byExercise = new Map<string, ExercisePR>();

  for (const set of sets) {
    if (!set.completed) continue;
    if (set.weight <= 0 || set.reps <= 0) continue;

    const at =
      typeof set.performedAt === "string"
        ? set.performedAt
        : set.performedAt.toISOString();
    const e1rm = estimate1RM(set.weight, set.reps);
    const volume = set.weight * set.reps;

    const current = byExercise.get(set.exerciseId);
    if (!current) {
      byExercise.set(set.exerciseId, {
        exerciseId: set.exerciseId,
        maxWeight: set.weight,
        maxWeightReps: set.reps,
        bestE1RM: e1rm,
        maxVolumeSet: volume,
        achievedAt: at,
      });
      continue;
    }

    if (set.weight > current.maxWeight) {
      current.maxWeight = set.weight;
      current.maxWeightReps = set.reps;
      current.achievedAt = at;
    }
    if (e1rm > current.bestE1RM) current.bestE1RM = e1rm;
    if (volume > current.maxVolumeSet) current.maxVolumeSet = volume;
  }

  return [...byExercise.values()];
}

export interface ProgressionPoint {
  date: string; // ISO (dia do treino)
  topWeight: number; // maior carga do dia naquele exercicio
  topE1RM: number; // maior 1RM estimado do dia
  totalVolume: number; // volume somado do dia
}

// Serie temporal de progressao de UM exercicio, um ponto por dia de treino.
export function computeProgression(sets: SetRecord[]): ProgressionPoint[] {
  const byDay = new Map<string, ProgressionPoint>();

  for (const set of sets) {
    if (!set.completed) continue;
    if (set.weight <= 0 || set.reps <= 0) continue;

    const iso =
      typeof set.performedAt === "string"
        ? set.performedAt
        : set.performedAt.toISOString();
    const day = iso.slice(0, 10);
    const e1rm = estimate1RM(set.weight, set.reps);
    const volume = set.weight * set.reps;

    const point = byDay.get(day);
    if (!point) {
      byDay.set(day, {
        date: day,
        topWeight: set.weight,
        topE1RM: e1rm,
        totalVolume: volume,
      });
      continue;
    }
    point.topWeight = Math.max(point.topWeight, set.weight);
    point.topE1RM = Math.max(point.topE1RM, e1rm);
    point.totalVolume += volume;
  }

  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
}
