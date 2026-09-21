import clsx from "clsx";

// Bloco de carregamento com brilho deslizante (keyframe `shimmer` em globals.css). Decorativo:
// o contêiner da página é que anuncia o estado de carregamento (aria-busy).
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={clsx(
        "relative overflow-hidden rounded-xl bg-zinc-200/70 dark:bg-white/8",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[shimmer_1.4s_infinite] after:bg-linear-to-r after:from-transparent after:via-white/60 after:to-transparent dark:after:via-white/10",
        className,
      )}
    />
  );
}
