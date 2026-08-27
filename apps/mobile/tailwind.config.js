/** @type {import('tailwindcss').Config} */
// Direcao de design: dark por padrao (treino e a noite, tela clara cega),
// base neutra + UMA cor de destaque (volt) reservada pra acao primaria.
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Base neutra (quase preto -> superficies elevadas)
        ink: {
          950: "#0B0B0C", // fundo
          900: "#131315", // card
          800: "#1C1C1F", // card elevado
          700: "#2A2A2E", // borda / input
          600: "#3A3A40",
        },
        // Texto
        chalk: {
          DEFAULT: "#FAFAFA", // primario
          muted: "#9A9AA2", // secundario
          faint: "#6A6A72", // terciario
        },
        // Destaque unico (volt) — so pra acao primaria / PR / serie feita
        volt: {
          DEFAULT: "#D7FF3E",
          dim: "#B4D62F",
          on: "#0B0B0C", // texto/icone sobre o volt
        },
        // Feedback
        blood: "#FF5A5A", // erro / destrutivo
      },
      fontFamily: {
        sans: ["System"],
      },
    },
  },
  plugins: [],
};
