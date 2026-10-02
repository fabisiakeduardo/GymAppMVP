# Landing — Maromba

Landing page do Maromba em **Vite + React + TypeScript**. Sem Tailwind: CSS
puro com os mesmos tokens do app (`ink`/`chalk`/`volt`, de
`apps/mobile/tailwind.config.js`) em `src/index.css`.

- Demo interativa do treino ao vivo no hero (`src/components/PhoneDemo.tsx`) —
  marca série, roda o cronômetro de descanso e mostra a tela de conclusão com
  PR calculado por `estimate1RM` do `@gymapp/shared`.
- Uma seção por arquivo em `src/components/`.
- Volt só em ação primária/PR — mesma regra do app.

## Rodando

```bash
bun install              # na raiz do monorepo
bun run dev:landing      # http://localhost:5173
```

> O `workspace:*` do `@gymapp/shared` exige Bun (ou pnpm) pra instalar.
