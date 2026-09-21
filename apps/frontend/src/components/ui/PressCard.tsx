"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";

const MotionLink = motion.create(Link);

// Card-link com resposta ao clique: afunda ao pressionar e, ao confirmar, uma onda de cor
// nasce no ponto do clique, o card se destaca e um spinner mostra que a página está abrindo.
// Ignora cliques com Ctrl/Cmd/Shift/botão do meio (abrir em nova aba não navega esta página).
export function PressCard({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const [opening, setOpening] = useState<{ x: number; y: number } | null>(null);

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setOpening({ x: event.clientX - rect.left, y: event.clientY - rect.top });
  }

  return (
    <MotionLink
      href={href}
      onClick={handleClick}
      whileTap={{ scale: 0.97 }}
      animate={{ scale: opening ? 1.025 : 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      aria-busy={opening ? true : undefined}
      className={clsx(
        "relative overflow-hidden",
        className,
        opening && "border-accent-500! shadow-xl shadow-accent-500/25",
      )}
    >
      {children}
      <AnimatePresence>
        {opening ? (
          <>
            <motion.span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-accent-500/12 dark:bg-accent-500/20"
              initial={{ clipPath: `circle(0px at ${opening.x}px ${opening.y}px)` }}
              animate={{ clipPath: `circle(220% at ${opening.x}px ${opening.y}px)` }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            />
            <motion.span
              aria-hidden
              className="pointer-events-none absolute top-3 right-3 flex items-center gap-1 rounded-full bg-accent-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-lg shadow-accent-500/30"
              initial={{ opacity: 0, scale: 0.6, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 26, delay: 0.08 }}
            >
              <CircleNotch size={12} weight="bold" className="animate-spin" />
              Abrindo
            </motion.span>
          </>
        ) : null}
      </AnimatePresence>
    </MotionLink>
  );
}
