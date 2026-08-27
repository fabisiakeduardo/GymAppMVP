import type { Workout } from "../api/types";

export interface LastPerformance {
  weight: number;
  reps: number;
  when: string; // ISO do treino
}

// "Ultima vez: X kg x Y" — pega a serie mais recente e mais pesada daquele
// exercicio no historico. E o dado que ancora o cara na hora de escolher a carga.
export function lastPerformance(
  history: Workout[],
  exerciseId: string,
): LastPerformance | null {
  const sorted = [...history].sort(
    (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
  );

  for (const workout of sorted) {
    const sets = workout.sets.filter(
      (s) => s.exerciseId === exerciseId && s.completed,
    );
    if (sets.length === 0) continue;
    // Serie mais pesada do treino mais recente que treinou esse exercicio.
    const best = sets.reduce((a, b) => (b.weight > a.weight ? b : a));
    return { weight: best.weight, reps: best.reps, when: workout.startedAt };
  }
  return null;
}
