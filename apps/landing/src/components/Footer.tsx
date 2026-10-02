import "./Footer.css";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">MAROMBA</span>
          <span className="footer-tag">Logbook de treino pro maromba brasileiro.</span>
        </div>
        <p className="footer-note">
          Sem sinal, sem problema — o treino fica no aparelho e sobe depois.
        </p>
      </div>
    </footer>
  );
}
