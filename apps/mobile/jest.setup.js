/* global jest */
// Mocks de modulos nativos que nao rodam em ambiente de teste.
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
  NotificationFeedbackType: { Success: "success" },
}));

jest.mock("expo-secure-store", () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

// Icones dependem de carregar fontes nativas — stub simples nos testes.
jest.mock("@expo/vector-icons", () => {
  const React = require("react");
  const stub = () => null;
  return new Proxy({}, { get: () => stub, has: () => true });
});
