// Roda antes dos testes (bunfig preload). Garante env minima pros modulos que
// leem process.env no import (env.ts).
process.env.JWT_SECRET ??= "test-secret-nao-use-em-producao-32-chars";
process.env.DATABASE_URL ??= "postgres://gymapp@localhost:5432/gymapp";
process.env.NODE_ENV ??= "test";
process.env.ACCESS_TOKEN_TTL ??= "15m";
