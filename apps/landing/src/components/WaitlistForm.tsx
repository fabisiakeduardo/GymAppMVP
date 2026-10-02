import { useId, useState } from "react";
import type { FormEvent } from "react";
import { Check, Mail } from "lucide-react";
import "./WaitlistForm.css";

type Mode = "dark" | "volt";

interface Props {
  mode?: Mode;
  id?: string;
}

// Captura de e-mail da lista de espera. Validacao leve no cliente — o papel
// da landing e prometer o produto, nao criar conta de verdade.
export function WaitlistForm({ mode = "dark", id }: Props) {
  const uid = useId();
  const inputId = id ?? `wl-${uid}`;
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "sent">("idle");

  function submit(e: FormEvent) {
    e.preventDefault();
    if (state === "sent") return;
    const value = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value)) {
      setState("error");
      return;
    }
    setState("sent");
  }

  const sent = state === "sent";

  return (
    <form className={`waitlist waitlist--${mode}`} onSubmit={submit} noValidate>
      <label className="sr-only" htmlFor={inputId}>
        Seu e-mail
      </label>
      <div className="waitlist-field">
        <Mail size={17} aria-hidden className="waitlist-icon" />
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          spellCheck={false}
          placeholder="seu@email.com"
          value={email}
          disabled={sent}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
        />
      </div>
      <button type="submit" className="btn waitlist-btn" disabled={sent}>
        {sent ? (
          <>
            <Check size={17} strokeWidth={2.75} aria-hidden /> Na lista
          </>
        ) : (
          "Entrar na lista"
        )}
      </button>
      <p className="waitlist-note" role="status" aria-live="polite">
        {state === "error" ? "E-mail inválido." : null}
        {sent ? "Avisamos quando abrir." : null}
      </p>
    </form>
  );
}
