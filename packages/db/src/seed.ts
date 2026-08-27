import { sql } from "drizzle-orm";
import { createDb } from "./client";
import { exercises } from "./schema";

// Exercicios globais em pt-BR. owner_id null = disponivel pra todo mundo.
const GLOBAL_EXERCISES: Array<{
  name: string;
  muscleGroup: string;
  equipment: string;
}> = [
  // Peito
  { name: "Supino reto", muscleGroup: "peito", equipment: "barra" },
  { name: "Supino inclinado", muscleGroup: "peito", equipment: "barra" },
  { name: "Supino com halteres", muscleGroup: "peito", equipment: "halter" },
  { name: "Crucifixo", muscleGroup: "peito", equipment: "halter" },
  { name: "Crossover", muscleGroup: "peito", equipment: "cabo" },
  { name: "Flexao de braco", muscleGroup: "peito", equipment: "peso_corporal" },
  // Costas
  { name: "Levantamento terra", muscleGroup: "costas", equipment: "barra" },
  { name: "Barra fixa", muscleGroup: "costas", equipment: "peso_corporal" },
  { name: "Puxada frente", muscleGroup: "costas", equipment: "cabo" },
  { name: "Remada curvada", muscleGroup: "costas", equipment: "barra" },
  { name: "Remada unilateral", muscleGroup: "costas", equipment: "halter" },
  { name: "Remada baixa", muscleGroup: "costas", equipment: "cabo" },
  // Pernas
  { name: "Agachamento livre", muscleGroup: "pernas", equipment: "barra" },
  { name: "Leg press", muscleGroup: "pernas", equipment: "maquina" },
  { name: "Cadeira extensora", muscleGroup: "pernas", equipment: "maquina" },
  { name: "Mesa flexora", muscleGroup: "pernas", equipment: "maquina" },
  { name: "Afundo", muscleGroup: "pernas", equipment: "halter" },
  { name: "Stiff", muscleGroup: "pernas", equipment: "barra" },
  // Gluteo
  { name: "Elevacao pelvica", muscleGroup: "gluteo", equipment: "barra" },
  { name: "Cadeira abdutora", muscleGroup: "gluteo", equipment: "maquina" },
  // Panturrilha
  { name: "Panturrilha em pe", muscleGroup: "panturrilha", equipment: "maquina" },
  { name: "Panturrilha sentado", muscleGroup: "panturrilha", equipment: "maquina" },
  // Ombro
  { name: "Desenvolvimento militar", muscleGroup: "ombro", equipment: "barra" },
  { name: "Desenvolvimento com halteres", muscleGroup: "ombro", equipment: "halter" },
  { name: "Elevacao lateral", muscleGroup: "ombro", equipment: "halter" },
  { name: "Elevacao frontal", muscleGroup: "ombro", equipment: "halter" },
  { name: "Encolhimento", muscleGroup: "ombro", equipment: "halter" },
  // Biceps
  { name: "Rosca direta", muscleGroup: "biceps", equipment: "barra" },
  { name: "Rosca alternada", muscleGroup: "biceps", equipment: "halter" },
  { name: "Rosca scott", muscleGroup: "biceps", equipment: "maquina" },
  { name: "Rosca martelo", muscleGroup: "biceps", equipment: "halter" },
  // Triceps
  { name: "Triceps na polia", muscleGroup: "triceps", equipment: "cabo" },
  { name: "Triceps testa", muscleGroup: "triceps", equipment: "barra" },
  { name: "Triceps frances", muscleGroup: "triceps", equipment: "halter" },
  { name: "Mergulho no banco", muscleGroup: "triceps", equipment: "peso_corporal" },
  // Abdomen
  { name: "Abdominal supra", muscleGroup: "abdomen", equipment: "peso_corporal" },
  { name: "Prancha", muscleGroup: "abdomen", equipment: "peso_corporal" },
  { name: "Elevacao de pernas", muscleGroup: "abdomen", equipment: "peso_corporal" },
  // Antebraco
  { name: "Rosca de punho", muscleGroup: "antebraco", equipment: "barra" },
];

async function main() {
  const { db, client } = createDb();

  console.log(`Semeando ${GLOBAL_EXERCISES.length} exercicios globais...`);

  let inserted = 0;
  for (const ex of GLOBAL_EXERCISES) {
    // Idempotente: nao duplica se ja existe global com mesmo nome.
    const existing = await db.execute(
      sql`SELECT 1 FROM exercises WHERE lower(name) = lower(${ex.name}) AND owner_id IS NULL LIMIT 1`,
    );
    if (existing.length > 0) continue;

    await db.insert(exercises).values({
      name: ex.name,
      muscleGroup: ex.muscleGroup,
      equipment: ex.equipment,
      isCustom: false,
      ownerId: null,
    });
    inserted++;
  }

  console.log(`Seed concluido. ${inserted} novos, ${GLOBAL_EXERCISES.length - inserted} ja existiam.`);
  await client.end();
}

main().catch((err) => {
  console.error("Falha no seed:", err);
  process.exit(1);
});
