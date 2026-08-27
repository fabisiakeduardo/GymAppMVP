# Imagem de dev do backend (hot reload via bun --watch).
FROM oven/bun:1.1

WORKDIR /app

# Copia manifests primeiro pra aproveitar cache de camadas.
COPY package.json bun.lock* ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/shared/package.json ./packages/shared/package.json

RUN bun install

# Codigo do backend + pacotes compartilhados.
COPY packages ./packages
COPY apps/api ./apps/api
COPY tsconfig.base.json ./

EXPOSE 3333

CMD ["bun", "run", "--cwd", "apps/api", "dev"]
