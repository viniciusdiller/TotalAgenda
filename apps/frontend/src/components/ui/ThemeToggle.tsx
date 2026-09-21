"use client";

import { AnimatePresence, motion } from "motion/react";
import { Moon, Sun } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useTheme } from "../ThemeProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.button
      type="button"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        toggleTheme({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 });
      }}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.9 }}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      className={clsx(
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white",
        className,
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isDark ? "sun" : "moon"}
          initial={{ opacity: 0, scale: 0.55, rotate: isDark ? 25 : -25 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.55 }}
          transition={{ duration: 0.25 }}
          className="inline-flex"
        >
          {isDark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
