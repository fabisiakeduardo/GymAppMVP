import { describe, it, expect } from "bun:test";
import {
  estimate1RM,
  computePRs,
  computeProgression,
  type SetRecord,
} from "@gymapp/shared";

describe("estimate1RM (Epley)", () => {
  it("retorna a propria carga em 1 rep", () => {
    expect(estimate1RM(100, 1)).toBe(100);
  });
  it("cresce com mais reps na mesma carga", () => {
    expect(estimate1RM(100, 10)).toBeGreaterThan(estimate1RM(100, 5));
  });
  it("zera com entradas invalidas", () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(100, 0)).toBe(0);
  });
});

const S = (
  exerciseId: string,
  weight: number,
  reps: number,
  performedAt: string,
  completed = true,
): SetRecord => ({ exerciseId, weight, reps, performedAt, completed });

describe("computePRs", () => {
  it("pega a maior carga por exercicio", () => {
    const prs = computePRs([
      S("supino", 80, 8, "2026-01-01T10:00:00.000Z"),
      S("supino", 100, 3, "2026-01-08T10:00:00.000Z"),
      S("supino", 90, 5, "2026-01-15T10:00:00.000Z"),
    ]);
    expect(prs).toHaveLength(1);
    expect(prs[0]!.maxWeight).toBe(100);
    expect(prs[0]!.maxWeightReps).toBe(3);
  });

  it("ignora series nao completadas", () => {
    const prs = computePRs([
      S("agacho", 200, 1, "2026-01-01T10:00:00.000Z", false),
      S("agacho", 120, 5, "2026-01-02T10:00:00.000Z", true),
    ]);
    expect(prs[0]!.maxWeight).toBe(120);
  });

  it("calcula maior volume numa serie", () => {
    const prs = computePRs([
      S("remada", 60, 10, "2026-01-01T10:00:00.000Z"), // 600
      S("remada", 80, 6, "2026-01-02T10:00:00.000Z"), // 480
    ]);
    expect(prs[0]!.maxVolumeSet).toBe(600);
  });

  it("separa PRs por exercicio", () => {
    const prs = computePRs([
      S("supino", 100, 3, "2026-01-01T10:00:00.000Z"),
      S("agacho", 140, 3, "2026-01-01T10:00:00.000Z"),
    ]);
    expect(prs).toHaveLength(2);
  });
});

describe("computeProgression", () => {
  it("agrega um ponto por dia, ordenado", () => {
    const points = computeProgression([
      S("supino", 80, 8, "2026-01-08T10:00:00.000Z"),
      S("supino", 82, 8, "2026-01-08T11:00:00.000Z"),
      S("supino", 70, 10, "2026-01-01T10:00:00.000Z"),
    ]);
    expect(points).toHaveLength(2);
    expect(points[0]!.date).toBe("2026-01-01");
    expect(points[1]!.date).toBe("2026-01-08");
    expect(points[1]!.topWeight).toBe(82);
    // volume do dia 08: 80*8 + 82*8 = 1296
    expect(points[1]!.totalVolume).toBe(1296);
  });

  it("ignora series nao completadas", () => {
    const points = computeProgression([
      S("supino", 999, 1, "2026-01-01T10:00:00.000Z", false),
    ]);
    expect(points).toHaveLength(0);
  });
});
