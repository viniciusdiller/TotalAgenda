"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: (origin?: { x: number; y: number }) => void } | null>(null);

// initialTheme vem do cookie "theme", já lido no servidor (layout.tsx) — o mesmo valor que
// decidiu a classe .dark no <html> renderizado. Sem isso o primeiro render client sempre
// começaria em "light" e corrigiria só depois de um efeito, piscando o ícone/label errado.
export function ThemeProvider({ children, initialTheme }: { children: ReactNode; initialTheme: Theme }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  // origin = centro (em px da viewport) de onde a revelação circular se expande — o botão
  // que disparou a troca. Sem View Transitions API, ou com prefers-reduced-motion, troca direto.
  function toggleTheme(origin?: { x: number; y: number }) {
    const next: Theme = theme === "dark" ? "light" : "dark";

    function apply() {
      setTheme(next);
      document.documentElement.classList.toggle("dark", next === "dark");
      // Cookie (não localStorage): precisa ser lido no servidor em layout.tsx pra decidir a
      // classe .dark do <html> antes do primeiro paint, sem script inline.
      document.cookie = `theme=${next}; path=/; max-age=31536000; samesite=lax`;
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
