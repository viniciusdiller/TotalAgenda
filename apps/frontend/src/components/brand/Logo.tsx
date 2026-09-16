"use client";

import { motion } from "motion/react";
import clsx from "clsx";
import { BRAND } from "./palette";

type LogoMarkVariant = "filled" | "standalone" | "white";

export function LogoMark({
  variant = "filled",
  size = 32,
  className,
}: {
  variant?: LogoMarkVariant;
  size?: number;
  className?: string;
}) {
  const mainStroke = variant === "filled" || variant === "white" ? "#fff" : BRAND.primary;
  const checkStroke = variant === "white" ? "#fff" : BRAND.accentCheck;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {variant === "filled" ? <rect width="48" height="48" rx="13" fill={BRAND.primary} /> : null}
      <path
        d="M13.5 37L24 11l10.5 26"
        stroke={mainStroke}
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 29.2l3.4 3.4 6.6-7.6"
        stroke={checkStroke}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({
  className,
  markSize = 32,
}: {
  className?: string;
  markSize?: number;
}) {
  return (
    <motion.span
      whileHover={{ y: -1 }}
      className={clsx("group inline-flex items-center gap-2.5", className)}
    >
      <LogoMark size={markSize} />
      <span className="font-brand text-lg font-bold tracking-[-0.02em] text-zinc-900 dark:text-white">
        Total
        <span className="text-(--brand-wordmark) transition-[filter] duration-200 group-hover:brightness-110">
          Agenda
        </span>
      </span>
    </motion.span>
  );
}
