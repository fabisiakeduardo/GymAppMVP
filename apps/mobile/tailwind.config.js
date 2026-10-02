/** @type {import('tailwindcss').Config} */
// Direcao de design: dark por padrao (treino e a noite, tela clara cega),
// base neutra + UMA cor de destaque (volt) reservada pra acao primaria.
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  // O preset do NativeWind usa darkMode 'media' por default — na web o
  // css-interop chama colorScheme.set() ao injetar a stylesheet e crasha.
  // O app e dark-only e nao usa variantes dark:, entao 'class' e seguro.
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Base neutra (quase preto -> superficies elevadas)
        ink: {
          950: "#0A0A0B", // fundo
          900: "#121214", // card
          850: "#17171A", // card elevado
          800: "#1E1E22", // input / hairline forte
          700: "#2B2B31", // borda ativa
          600: "#3E3E46",
        },
        // Texto
        chalk: {
          DEFAULT: "#FAFAFA", // primario
          muted: "#9A9AA2", // secundario
          faint: "#63636B", // terciario
        },
        // Destaque unico (volt) — so pra acao primaria / PR / serie feita
        volt: {
          DEFAULT: "#D7FF3E",
          dim: "#B4D62F",
          wash: "#1F2606", // fundo escuro tingido de volt (em andamento)
          on: "#0A0A0B", // texto/icone sobre o volt
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
