// Mascaras e sanitizacao de inputs. pt-BR usa virgula decimal — aceita
// ponto tambem porque teclado decimal-pad as vezes manda "."
// Tudo aqui e pura funcao de string, testavel.

// So deixa "123", "123,4", "123.45" — um separador decimal, N casas.
export function sanitizeDecimal(input: string, maxDecimals = 1): string {
  const cleaned = input.replace(/\./g, ",").replace(/[^\d,]/g, "");
  const firstComma = cleaned.indexOf(",");
  if (firstComma === -1) return cleaned.slice(0, 6);
  const intPart = cleaned.slice(0, firstComma).slice(0, 6);
  const decPart = cleaned.slice(firstComma + 1).replace(/,/g, "").slice(0, maxDecimals);
  return decPart.length > 0 || cleaned.endsWith(",")
    ? `${intPart},${decPart}`
    : intPart;
}

// So digitos, com teto (altura em cm, reps, etc).
export function sanitizeInt(input: string, maxLength = 3): string {
  return input.replace(/\D/g, "").slice(0, maxLength);
}

// DD/MM/AAAA com as barras entrando sozinhas: "02102026" -> "02/10/2026".
export function maskDateBR(input: string): string {
  const d = input.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

// "62,5" -> 62.5 (number), vazio -> null.
export function parseDecimal(input: string): number | null {
  const t = input.trim().replace(",", ".");
  if (!t) return null;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : null;
}
