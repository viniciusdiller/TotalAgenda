"use client";

import { motion } from "motion/react";

// Onda de cor que se expande a partir do ponto do clique (x/y relativos ao elemento pai, que
// precisa ser relative + overflow-hidden). Usada pelos cards clicáveis do site.
export function RippleFill({
  x,
  y,
  onDone,
}: {
  x: number;
  y: number;
  onDone?: () => void;
}) {
  return (
    <motion.span
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-accent-500/12 dark:bg-accent-500/20"
      initial={{ clipPath: `circle(0px at ${x}px ${y}px)` }}
      animate={{ clipPath: `circle(220% at ${x}px ${y}px)` }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      onAnimationComplete={onDone}
    />
  );
}
