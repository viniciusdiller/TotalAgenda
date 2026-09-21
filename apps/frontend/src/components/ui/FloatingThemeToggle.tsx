import { ThemeToggle } from "./ThemeToggle";

// Alternador de tema sempre à mão em qualquer página (montado uma vez no layout raiz). Abaixo
// dos modais (z-50) pra nunca cobrir um diálogo aberto.
export function FloatingThemeToggle() {
  return (
    <div className="fixed right-4 bottom-4 z-40 rounded-full border border-zinc-200 bg-white/85 p-1.5 shadow-lg shadow-zinc-900/10 backdrop-blur-md print:hidden dark:border-white/10 dark:bg-zinc-900/85 dark:shadow-black/40">
      <ThemeToggle />
    </div>
  );
}
