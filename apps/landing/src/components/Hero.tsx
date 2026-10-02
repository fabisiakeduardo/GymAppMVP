import { PhoneDemo } from "./PhoneDemo";
import { WaitlistForm } from "./WaitlistForm";
import "./Hero.css";

export function Hero() {
  return (
    <section className="hero container" id="top">
      <div className="hero-copy">
        <p className="hero-tag">Logbook de treino · lista de espera</p>
        <h1 className="h-display hero-title">Logue o treino antes da próxima série.</h1>
        <p className="lede hero-sub">
          O Maromba é feito pra usar dentro da academia: peso e reps num toque, a última
          vez sempre visível, cronômetro de descanso automático — e o treino nunca se
          perde, mesmo sem sinal.
        </p>
        <WaitlistForm id="hero-email" />
        <dl className="hero-stats">
          <div className="hero-stat">
            <dt className="hero-stat-label">Pra logar a série</dt>
            <dd className="hero-stat-value">1 mão</dd>
          </div>
          <div className="hero-stat">
            <dt className="hero-stat-label">Passo do stepper de anilha</dt>
            <dd className="hero-stat-value">2,5 kg</dd>
          </div>
          <div className="hero-stat">
            <dt className="hero-stat-label">Treinos perdidos sem sinal</dt>
            <dd className="hero-stat-value volt">0</dd>
          </div>
        </dl>
      </div>
      <div className="hero-demo">
        <div className="hero-glow" aria-hidden />
        <PhoneDemo />
        <p className="hero-hint">Funciona de verdade — marca uma série aí.</p>
      </div>
    </section>
  );
}
