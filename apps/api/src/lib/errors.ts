// Erros consistentes no formato { error: { code, message } }.

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const Errors = {
  invalidCredentials: () =>
    // Mensagem generica de proposito: nunca revela se o email existe.
    new ApiError(401, "INVALID_CREDENTIALS", "Email ou senha incorretos."),
  emailTaken: () => new ApiError(409, "EMAIL_TAKEN", "Esse email ja tem conta."),
  unauthorized: () => new ApiError(401, "UNAUTHORIZED", "Faca login pra continuar."),
  invalidToken: () => new ApiError(401, "INVALID_TOKEN", "Sessao expirada. Entre de novo."),
  notFound: (what = "Recurso") => new ApiError(404, "NOT_FOUND", `${what} nao encontrado.`),
  forbidden: () => new ApiError(403, "FORBIDDEN", "Isso nao e seu."),
  readOnly: () => new ApiError(403, "READ_ONLY", "Exercicio global nao pode ser editado."),
  rateLimited: () =>
    new ApiError(429, "RATE_LIMITED", "Muitas tentativas. Respira e tenta em 1 min."),
  validation: (message: string) => new ApiError(422, "VALIDATION", message),
} as const;

export function errorBody(code: string, message: string) {
  return { error: { code, message } };
}
