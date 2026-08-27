module.exports = function (api) {
  // Cache depende do NODE_ENV: em teste (jest) dispensamos o plugin do
  // reanimated (nao usamos worklets nos testes e ele puxa deps nativas).
  const isTest = api.env("test");
  api.cache.using(() => process.env.NODE_ENV);

  return {
    presets: [
      // reanimated:false -> desliga a injecao automatica do plugin de worklets
      // do preset (que espera react-native-worklets). Adicionamos o plugin
      // correto do reanimated 3.x nos mesmos (fora do ambiente de teste).
      ["babel-preset-expo", { jsxImportSource: "nativewind", reanimated: false }],
      "nativewind/babel",
    ],
    plugins: isTest ? [] : ["react-native-reanimated/plugin"],
  };
};
