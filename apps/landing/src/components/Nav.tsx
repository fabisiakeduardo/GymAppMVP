import "./Nav.css";

export function Nav() {
  return (
    <header className="nav">
      <div className="container nav-inner">
        <a className="nav-brand" href="#top" aria-label="Maromba — início">
          MAROMBA
        </a>
        <nav className="nav-links" aria-label="Navegação principal">
          <a href="#como-funciona">Como funciona</a>
          <a href="#lista">Lista de espera</a>
        </nav>
        <a className="btn btn-primary nav-cta" href="#lista">
          Entrar na lista
        </a>
      </div>
    </header>
  );
}
