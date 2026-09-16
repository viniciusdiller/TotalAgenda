"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

// O valor inicial ("light") é só o que o server consegue renderizar sem acesso a
// localStorage/matchMedia — a classe .dark real na <html> já foi aplicada antes do
// paint pelo script inline em layout.tsx (evita flash de tema errado). O useEffect
// aqui só sincroniza o estado do React com o que já está no DOM, não decide o tema.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.classList.toggle("dark", next === "dark");
      try {
        localStorage.setItem("theme", next);
      } catch {
        // Storage bloqueado (modo privado, cookies desabilitados) — tema ainda troca
        // nesta sessão, só não persiste entre visitas.
      }
      return next;
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
