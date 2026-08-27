module.exports = {
  preset: "jest-expo",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  // Bun guarda os pacotes em node_modules/.bun/<pkg>@<ver>/node_modules/<pkg>.
  // O padrao classico so olha o segmento logo apos o 1o node_modules, entao
  // deixamos o prefixo .bun/ opcional e casamos o nome do pacote (com @/+ do store).
  transformIgnorePatterns: [
    "node_modules/(?!(?:\\.bun/|\\.pnpm/)?(?:jest-)?(?:@?react-native|@react-navigation|expo|@expo|nativewind|react-native-css-interop|@gymapp))",
  ],
};
