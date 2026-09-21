"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "@phosphor-icons/react/dist/ssr";
import { RippleFill } from "./RippleFill";

// Card de escolha única. Ao clicar: afunda, uma onda de cor nasce no ponto do clique e um selo
// de check "salta" no canto — a confirmação visual que o passo seguinte do fluxo não dá tempo
// de mostrar sozinha.
export function RadioCard({
  selected,
  onClick,
  children,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  const [ripple, setRipple] = useState<{ x: number; y: number; id: number } | null>(null);

  function handleClick(event: MouseEvent<HTMLButtonElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    setRipple((prev) => ({ x, y, id: (prev?.id ?? 0) + 1 }));
    onClick();
  }

  return (
    <motion.button
      type="button"
      onClick={handleClick}
      aria-pressed={selected}
      whileTap={{ scale: 0.97 }}
      animate={{ scale: selected ? 1.015 : 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 26 }}
      className={clsx(
        "relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-(--tenant-accent)/40",
        selected
          ? "border-(--tenant-accent) bg-(--tenant-accent)/10"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/20",
        className,
      )}
    >
      {children}
      {ripple ? (
        <RippleFill key={ripple.id} x={ripple.x} y={ripple.y} onDone={() => setRipple(null)} />
      ) : null}
      <AnimatePresence>
        {selected ? (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-(--tenant-accent) text-white"
            initial={{ scale: 0, rotate: -40 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 20 }}
          >
            <Check size={12} weight="bold" />
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.button>
  );
}
