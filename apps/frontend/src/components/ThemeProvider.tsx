"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: (origin?: { x: number; y: number }) => void } | null>(null);

// O valor inicial ("light") é só o que o server consegue renderizar sem acesso a
// localStorage/matchMedia — a classe .dark real na <html> já foi aplicada antes do
// paint pelo script inline em layout.tsx (evita flash de tema errado). O useEffect
// aqui só sincroniza o estado do React com o que já está no DOM, não decide o tema.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  // origin = centro (em px da viewport) de onde a revelação circular se expande — o botão
  // que disparou a troca. Sem View Transitions API, ou com prefers-reduced-motion, troca direto.
  function toggleTheme(origin?: { x: number; y: number }) {
    const next: Theme = theme === "dark" ? "light" : "dark";

    function apply() {
      setTheme(next);
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem("theme", next);
      } catch {
        // Storage bloqueado (modo privado, cookies desabilitados) — tema ainda troca
        // nesta sessão, só não persiste entre visitas.
      }
    }

    const animate =
      origin &&
      typeof document.startViewTransition === "function" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate) {
      apply();
      return;
    }

    const radius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y),
    );
    const transition = document.startViewTransition(() => flushSync(apply));
    transition.ready
      .then(() => {
        document.documentElement.animate(
          {
            clipPath: [
              `circle(0px at ${origin.x}px ${origin.y}px)`,
              `circle(${radius}px at ${origin.x}px ${origin.y}px)`,
            ],
          },
          { duration: 650, easing: "cubic-bezier(0.4, 0, 0.2, 1)", pseudoElement: "::view-transition-new(root)" },
        );
      })
      .catch(() => {
        // Transição abortada (ex.: outra troca em andamento): o tema já foi aplicado.
      });
  }

  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme precisa ser usado dentro de <ThemeProvider>.");
  }
  return ctx;
}
