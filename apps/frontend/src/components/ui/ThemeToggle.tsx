"use client";

import { motion } from "motion/react";
import { Moon, Sun } from "@phosphor-icons/react/dist/ssr";
import clsx from "clsx";
import { useTheme } from "../ThemeProvider";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.9 }}
      aria-label={isDark ? "Mudar para tema claro" : "Mudar para tema escuro"}
      className={clsx(
        "inline-flex h-9 w-9 items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-900/5 hover:text-zinc-900 dark:text-stone-300 dark:hover:bg-white/10 dark:hover:text-white",
        className,
      )}
    >
      {isDark ? <Sun size={18} weight="bold" /> : <Moon size={18} weight="bold" />}
    </motion.button>
  );
}
