import { useEffect, useState } from "react";
import { estimate1RM } from "@gymapp/shared/logic";
import { Check, Trophy } from "lucide-react";
import "./PhoneDemo.css";

const REST_TOTAL = 90;
const PLATE_STEP = 2.5; // anilha padrão: sobe/desce de 2,5 kg

function formatClock(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmtVolume(kg: number) {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace(".", ",")}t`;
  return `${Math.round(kg)} kg`;
}

interface DemoSet {
  weight: string;
  reps: string;
  done: boolean;
}

interface DemoExercise {
  id: string;
  name: string;
  prevWeight: number; // "última vez"
  prevReps: number;
  prevBestE1RM: number; // melhor e1RM histórico, pra marcar PR
  sets: DemoSet[];
}

function seedExercises(): DemoExercise[] {
  return [
    {
      id: "supino",
      name: "Supino reto",
      prevWeight: 70,
      prevReps: 8,
      prevBestE1RM: 70 * (1 + 8 / 30), // 88.7
      sets: [
        { weight: "70", reps: "8", done: false },
        { weight: "70", reps: "8", done: false },
        { weight: "70", reps: "8", done: false },
      ],
    },
    {
      id: "crucifixo",
      name: "Crucifixo",
      prevWeight: 18,
      prevReps: 12,
      prevBestE1RM: 18 * (1 + 12 / 30), // 25.2
      sets: [
        { weight: "18", reps: "12", done: false },
        { weight: "18", reps: "12", done: false },
      ],
    },
    {
      id: "triceps",
      name: "Tríceps pulley",
      prevWeight: 25,
      prevReps: 10,
      prevBestE1RM: 25 * (1 + 10 / 30), // 33.3
      sets: [
        { weight: "25", reps: "10", done: false },
        { weight: "25", reps: "10", done: false },
      ],
    },
  ];
}

function parseWeight(s: string) {
  return parseFloat(s.replace(",", ".")) || 0;
}
function parseReps(s: string) {
  return parseInt(s, 10) || 0;
}

// Demo do coração do produto: logar a série com uma mão e deixar o descanso
// correr sozinho. Estado local puro — a proposta é o visitante "sentir" o app.
export function PhoneDemo() {
  const [exercises, setExercises] = useState<DemoExercise[]>(seedExercises);
  const [rest, setRest] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const [finishedAt, setFinishedAt] = useState<number | null>(null);

  const finished = finishedAt !== null;

  const current = (() => {
    for (let e = 0; e < exercises.length; e++) {
      const ex = exercises[e];
      if (!ex) continue;
      const s = ex.sets.findIndex((set) => !set.done);
      if (s >= 0) return { e, s };
    }
    return null;
  })();

  // Relógio do treino — corre enquanto houver série pendente.
  useEffect(() => {
    if (finished) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [startedAt, finished]);

  // Descanso: decrementa enquanto a barra está visível.
  useEffect(() => {
    if (rest === null) return;
    const id = setInterval(() => {
      setRest((r) => (r === null || r <= 0 ? r : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [rest === null]);

  // Zerou: esconde a barra e libera a próxima série.
  useEffect(() => {
    if (rest === 0) setRest(null);
  }, [rest]);

  function updateSet(ei: number, si: number, patch: Partial<DemoSet>) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === ei
          ? { ...ex, sets: ex.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) }
          : ex,
      ),
    );
  }

  function toggleSet(ei: number, si: number) {
    const ex = exercises[ei];
    const set = ex?.sets[si];
    if (!ex || !set) return;

    if (!set.done) {
      updateSet(ei, si, { done: true });
      const remaining = exercises
        .slice(ei)
        .reduce((acc, e) => acc + e.sets.filter((s) => !s.done).length, 0);
      // essa série ainda contava como pendente; se não sobra mais nada, fecha.
      if (remaining - 1 <= 0) {
        setRest(null);
        setFinishedAt(Date.now());
      } else {
        setRest(REST_TOTAL);
      }
    } else {
      updateSet(ei, si, { done: false });
      setRest(null);
      setFinishedAt(null);
    }
  }

  function bump(ei: number, si: number, delta: number) {
    const set = exercises[ei]?.sets[si];
    if (!set || set.done) return;
    const next = Math.max(0, Math.round((parseWeight(set.weight) + delta) * 10) / 10);
    updateSet(ei, si, { weight: String(next) });
  }

  function restart() {
    setExercises(seedExercises());
    setRest(null);
    setFinishedAt(null);
    setElapsed(0);
    setStartedAt(Date.now());
  }

  const totalSets = exercises.reduce((n, ex) => n + ex.sets.length, 0);
  const doneSets = exercises.reduce((n, ex) => n + ex.sets.filter((s) => s.done).length, 0);
  const volumeKg = exercises.reduce(
    (n, ex) =>
      n + ex.sets.reduce((m, s) => (s.done ? m + parseWeight(s.weight) * parseReps(s.reps) : m), 0),
    0,
  );
  const durationSec = finishedAt
    ? Math.max(0, Math.floor((finishedAt - startedAt) / 1000))
    : elapsed;

  const newPrs = exercises.filter((ex) => {
    const top = Math.max(
      0,
      ...ex.sets.map((s) => (s.done ? estimate1RM(parseWeight(s.weight), parseReps(s.reps)) : 0)),
    );
    return top > ex.prevBestE1RM;
  });

  return (
    <div className="phone" aria-label="Demonstração do app Maromba">
      <div className="phone-screen">
        <div className="phone-notch" aria-hidden />
        {!finished ? (
          <LiveScreen
            exercises={exercises}
            current={current}
            elapsed={elapsed}
            doneSets={doneSets}
            totalSets={totalSets}
            rest={rest}
            onToggle={toggleSet}
            onBump={bump}
            onEdit={updateSet}
            onSkip={() => setRest(null)}
          />
        ) : (
          <DoneScreen
            duration={durationSec}
            doneSets={doneSets}
            volumeKg={volumeKg}
            exercises={exercises}
            newPrs={newPrs}
            onRestart={restart}
          />
        )}
      </div>
    </div>
  );
}

/* ---------------- Tela ao vivo ---------------- */

interface LiveProps {
  exercises: DemoExercise[];
  current: { e: number; s: number } | null;
  elapsed: number;
  doneSets: number;
  totalSets: number;
  rest: number | null;
  onToggle: (e: number, s: number) => void;
  onBump: (e: number, s: number, delta: number) => void;
  onEdit: (e: number, s: number, patch: Partial<DemoSet>) => void;
  onSkip: () => void;
}

function LiveScreen({
  exercises,
  current,
  elapsed,
  doneSets,
  totalSets,
  rest,
  onToggle,
  onBump,
  onEdit,
  onSkip,
}: LiveProps) {
  const resting = rest !== null && rest > 0;
  return (
    <div className="live">
      <header className="live-head">
        <div>
          <p className="live-label">
            Em andamento
            <span className="live-count">
              {doneSets}/{totalSets} séries
            </span>
          </p>
          <p className="live-title">Treino A · peito</p>
        </div>
        <p className="live-elapsed">{formatClock(elapsed)}</p>
      </header>

      <div className="live-list">
        {exercises.map((ex, ei) => (
          <section className="live-exercise" key={ex.id}>
            <p className="live-ex-name">{ex.name}</p>
            {ex.sets.map((set, si) => {
              const isCurrent = current?.e === ei && current?.s === si;
              return (
                <div
                  key={si}
                  className={`setrow ${set.done ? "is-done" : ""} ${isCurrent ? "is-current" : ""}`}
                >
                  {isCurrent && (
                    <p className="setrow-hint">
                      agora · última vez: {ex.prevWeight} kg × {ex.prevReps}
                    </p>
                  )}
                  <div className="setrow-line">
                    <span className="setrow-num">{si + 1}</span>
                    <div className="setrow-field setrow-weight">
                      <button
                        type="button"
                        className="setrow-step"
                        aria-label={`Reduzir 2,5 kg na série ${si + 1} de ${ex.name}`}
                        onClick={() => onBump(ei, si, -PLATE_STEP)}
                        disabled={set.done}
                      >
                        −
                      </button>
                      <input
                        className="setrow-input"
                        value={set.weight}
                        inputMode="decimal"
                        aria-label={`Carga da série ${si + 1} de ${ex.name} em kg`}
                        disabled={set.done}
                        onChange={(e) =>
                          onEdit(ei, si, { weight: e.target.value.replace(/[^\d,.]/g, "") })
                        }
                      />
                      <span className="setrow-unit">kg</span>
                      <button
                        type="button"
                        className="setrow-step"
                        aria-label={`Aumentar 2,5 kg na série ${si + 1} de ${ex.name}`}
                        onClick={() => onBump(ei, si, PLATE_STEP)}
                        disabled={set.done}
                      >
                        +
                      </button>
                    </div>
                    <div className="setrow-field setrow-reps">
                      <input
                        className="setrow-input"
                        value={set.reps}
                        inputMode="numeric"
                        maxLength={2}
                        aria-label={`Repetições da série ${si + 1} de ${ex.name}`}
                        disabled={set.done}
                        onChange={(e) =>
                          onEdit(ei, si, { reps: e.target.value.replace(/\D/g, "").slice(0, 2) })
                        }
                      />
                      <span className="setrow-unit">×</span>
                    </div>
                    <button
                      type="button"
                      className="setrow-check"
                      aria-label={
                        set.done
                          ? `Desmarcar série ${si + 1} de ${ex.name}`
                          : `Marcar série ${si + 1} de ${ex.name} como feita`
                      }
                      onClick={() => onToggle(ei, si)}
                    >
                      <Check
                        size={22}
                        strokeWidth={set.done ? 3 : 2.5}
                        aria-hidden
                        className={set.done ? "text-volt-on" : ""}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </section>
        ))}
      </div>

      <div className={`restbar ${resting ? "is-on" : ""}`} aria-hidden={!resting}>
        <div className="restbar-track">
          <div
            className="restbar-fill"
            style={{ width: `${resting ? Math.round(((rest ?? 0) / REST_TOTAL) * 100) : 0}%` }}
          />
        </div>
        <div className="restbar-row">
          <div>
            <p className="restbar-label">Descanso</p>
            <p className="restbar-clock">{formatClock(rest ?? 0)}</p>
          </div>
          <button
            type="button"
            className="restbar-skip"
            onClick={onSkip}
            tabIndex={resting ? 0 : -1}
          >
            Pular
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Tela de conclusão ---------------- */

interface DoneProps {
  duration: number;
  doneSets: number;
  volumeKg: number;
  exercises: DemoExercise[];
  newPrs: DemoExercise[];
  onRestart: () => void;
}

function DoneScreen({ duration, doneSets, volumeKg, exercises, newPrs, onRestart }: DoneProps) {
  return (
    <div className="done">
      <p className="done-label">Treino concluído</p>
      <p className="done-clock">{formatClock(duration)}</p>

      <div className="done-stats">
        {[
          { label: "Séries", value: String(doneSets) },
          { label: "Volume", value: fmtVolume(volumeKg) },
          { label: "Exercícios", value: String(exercises.length) },
        ].map((it, i) => (
          <div key={it.label} className={`done-stat ${i > 0 ? "with-border" : ""}`}>
            <p className="done-stat-value">{it.value}</p>
            <p className="done-stat-label">{it.label}</p>
          </div>
        ))}
      </div>

      {newPrs.length > 0 && (
        <div className="done-pr">
          <div className="done-pr-head">
            <Trophy size={16} aria-hidden />
            <span>{newPrs.length === 1 ? "Novo recorde" : `${newPrs.length} novos recordes`}</span>
          </div>
          {newPrs.map((ex) => {
            const top = ex.sets
              .filter((s) => s.done)
              .reduce((best, s) => {
                const e = estimate1RM(parseWeight(s.weight), parseReps(s.reps));
                return e > estimate1RM(parseWeight(best.weight), parseReps(best.reps)) ? s : best;
              }, ex.sets[0] ?? { weight: "0", reps: "0", done: false });
            return (
              <p key={ex.id} className="done-pr-row">
                {ex.name} — {top.weight} kg × {top.reps}
              </p>
            );
          })}
        </div>
      )}

      <p className="done-section">Hoje</p>
      <ul className="done-list">
        {exercises.map((ex, i) => {
          const done = ex.sets.filter((s) => s.done);
          const topWeight = Math.max(0, ...done.map((s) => parseWeight(s.weight)));
          const topSet = done.find((s) => parseWeight(s.weight) === topWeight);
          const isPr = newPrs.some((p) => p.id === ex.id);
          return (
            <li key={ex.id} className={`done-row ${i === exercises.length - 1 ? "last" : ""}`}>
              <span className="done-row-name">
                {ex.name}
                {isPr && <Trophy size={13} aria-hidden />}
              </span>
              <span className="done-row-nums">
                {topWeight} kg × {topSet ? topSet.reps : 0}
              </span>
            </li>
          );
        })}
      </ul>

      <button type="button" className="btn btn-ghost done-again" onClick={onRestart}>
        De novo
      </button>
    </div>
  );
}
