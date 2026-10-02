import { Trophy } from "lucide-react";
import { WaitlistForm } from "./WaitlistForm";
import "./Cta.css";

// O único bloco volt em tela cheia da página — o "momento" reservado pra
// converter, mesmo papel da tela de treino concluído no app.
export function Cta() {
  return (
    <section className="section cta-section" id="lista">
      <div className="container">
        <div className="cta-card">
          <span className="cta-icon" aria-hidden>
            <Trophy size={28} strokeWidth={2.25} />
          </span>
          <h2 className="cta-title">Seu próximo recorde tá a uma série.</h2>
          <p className="cta-sub">
            Estamos liberando acesso em levas pra manter o treino liso. Entra na
            lista e a gente te chama.
          </p>
          <div className="cta-form">
            <WaitlistForm mode="volt" id="cta-email" />
          </div>
        </div>
      </div>
    </section>
  );
}
