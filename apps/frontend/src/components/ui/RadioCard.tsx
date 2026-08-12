"use client";

import { type ReactNode } from "react";
import clsx from "clsx";

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
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={clsx(
        "w-full rounded-2xl border p-4 text-left transition-colors",
        selected
          ? "border-(--tenant-accent) bg-(--tenant-accent)/10"
          : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-white/20",
        className,
      )}
    >
      {children}
    </button>
  );
}
