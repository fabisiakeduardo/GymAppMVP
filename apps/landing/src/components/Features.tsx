import { Check, CloudOff, Dumbbell, Timer, TrendingUp, Trophy } from "lucide-react";
import "./Features.css";

// Grade assimétrica: os dois primeiros cards levam um "mini-app" como asset
// (linha de série + sparkline de peso), os demais ficam quietos.
export function Features() {
  return (
    <section className="section" id="como-funciona">
      <div className="container">
        <div className="features-head">
          <h2 className="h-section">Tudo no lugar quando o ferro tá na mão.</h2>
          <p className="lede">
            Cada tela tem um trabalho só. Se precisa de mais de um toque pra
            registrar uma série, não entra no app.
          </p>
        </div>

        <div className="features-grid">
          <article className="feature feature-wide">
            <div className="feature-icon" aria-hidden>
              <Dumbbell size={18} />
            </div>
            <h3 className="feature-title">Treino sempre em andamento</h3>
            <p className="feature-body">
              Começou, ficou. A série atual mostra a última vez, o stepper sobe de
              anilha em anilha e o check é grande o bastante pra acertar entre uma
              respiração e outra.
            </p>
            <div className="feature-asset" aria-hidden>
              <div className="mini-set is-done">
                <span className="mini-num">1</span>
                <span className="mini-field mini-w">
                  <b>70</b>
                  <i>kg</i>
                </span>
                <span className="mini-field">
                  <b>8</b>
                  <i>×</i>
                </span>
                <span className="mini-check">
                  <Check size={16} strokeWidth={3} />
                </span>
              </div>
              <div className="mini-set is-current">
                <span className="mini-num">2</span>
                <span className="mini-field mini-w">
                  <b>72,5</b>
                  <i>kg</i>
                </span>
                <span className="mini-field">
                  <b>8</b>
                  <i>×</i>
                </span>
                <span className="mini-check">
                  <Check size={16} strokeWidth={2.5} />
                </span>
              </div>
            </div>
          </article>

          <article className="feature">
            <div className="feature-icon" aria-hidden>
              <TrendingUp size={18} />
            </div>
            <h3 className="feature-title">Seu corpo, também registrado</h3>
            <p className="feature-body">
              Peso, % de gordura e medidas com gráfico por dia. Bulking ou
              cutting, a curva conta a história sem você fazer conta.
            </p>
            <div className="feature-asset" aria-hidden>
              <svg
                className="mini-chart"
                viewBox="0 0 220 72"
                fill="none"
                role="img"
              >
                <path
                  d="M0 14 31 18 63 30 94 27 126 42 157 55 188 50 220 62"
                  stroke="var(--ink-700)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M0 18 31 24 63 34 94 32 126 44 157 52 188 48 220 58"
                  stroke="var(--volt)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="220" cy="58" r="4" fill="var(--volt)" />
              </svg>
              <div className="mini-chart-labels">
                <span>Peso · 12 semanas</span>
                <span className="volt">−2,6 kg</span>
              </div>
            </div>
          </article>

          <article className="feature">
            <div className="feature-icon" aria-hidden>
              <Trophy size={18} />
            </div>
            <h3 className="feature-title">PRs no automático</h3>
            <p className="feature-body">
              Cada série vira histórico. Quando o e1RM passa do seu melhor, o
              troféu aparece no resumo — sem planilha.
            </p>
          </article>

          <article className="feature">
            <div className="feature-icon" aria-hidden>
              <Timer size={18} />
            </div>
            <h3 className="feature-title">Descanso já cronometrado</h3>
            <p className="feature-body">
              Completou a série, o cronômetro roda. Presets de 60, 90 e 120s e um
              +15 pra quando o banco demora.
            </p>
          </article>

          <article className="feature">
            <div className="feature-icon" aria-hidden>
              <CloudOff size={18} />
            </div>
            <h3 className="feature-title">Funciona no porão da academia</h3>
            <p className="feature-body">
              Sem sinal? O treino fica salvo no aparelho e sobe pra sua conta
              quando a rede volta. Zero série perdida.
            </p>
          </article>
        </div>
      </div>
    </section>
  );
}
