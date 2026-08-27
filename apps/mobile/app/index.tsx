import { Redirect } from "expo-router";

// App abre direto no Treinar — da pra logar o primeiro treino sem conta.
export default function Index() {
  return <Redirect href="/(tabs)/treinar" />;
}
