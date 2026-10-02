import { Nav } from "./components/Nav";
import { Hero } from "./components/Hero";
import { Features } from "./components/Features";
import { Cta } from "./components/Cta";
import { Footer } from "./components/Footer";

export function App() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
