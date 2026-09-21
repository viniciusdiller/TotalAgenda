"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarCheck,
  CaretDown,
  SignOut,
  Storefront,
  UserGear,
} from "@phosphor-icons/react/dist/ssr";
import { logoutConsumerAction } from "@/app/minha-conta/actions";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

const ITEMS = [
  { href: "/minha-conta", label: "Minha agenda", hint: "Próximos horários e histórico", Icon: CalendarCheck },
  { href: "/minha-conta?aba=saloes", label: "Salões visitados", hint: "Onde você já agendou", Icon: Storefront },
  { href: "/minha-conta?aba=conta", label: "Dados e segurança", hint: "Nome, e-mail e senha", Icon: UserGear },
] as const;

const ITEM_CLASS =
  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent-500 hover:bg-zinc-900/5 dark:hover:bg-white/10";

// Chip do perfil que abre um menu com as opções da conta. Padrão "disclosure" (botão com
// aria-expanded + lista de links), sem role="menu" — não exige navegação por setas. Fecha ao
// clicar fora, com Escape (devolvendo o foco ao botão) e ao navegar.
export function AccountMenu({ name, upcomingCount = 0 }: { name: string; upcomingCount?: number }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);

  // Fecha ao trocar de rota (ajuste de estado durante o render, padrão recomendado pelo React
  // no lugar de setState dentro de useEffect).
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const firstName = name.split(" ")[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="account-menu"
        className="flex items-center gap-2.5 rounded-full border border-zinc-200 py-1.5 pr-3 pl-1.5 transition-colors hover:border-(--tenant-accent)/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 dark:border-white/10"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--tenant-accent) font-brand text-[13px] font-bold text-white">
          {initials(name)}
        </span>
        <span className="hidden flex-col text-left leading-tight sm:flex">
          <span className="text-[13px] font-semibold text-zinc-900 dark:text-white">{firstName}</span>
          <span className="text-[11px] text-zinc-500 dark:text-stone-400">Meu Cadastro</span>
        </span>
        <CaretDown
          size={13}
          weight="bold"
          className={clsx("text-zinc-400 transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
      {open ? (
        <motion.div
          id="account-menu"
          initial={{ opacity: 0, scale: 0.95, y: -6 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: -4 }}
          transition={{ type: "spring", stiffness: 520, damping: 34, mass: 0.7 }}
          style={{ transformOrigin: "top right" }}
          className="absolute top-full right-0 z-50 mt-2 w-72 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl shadow-zinc-900/10 dark:border-white/10 dark:bg-zinc-900 dark:shadow-black/40"
        >
          <div className="flex items-center gap-3 px-3 py-2.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-(--tenant-accent) font-brand text-sm font-bold text-white">
              {initials(name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">{name}</p>
              <p className="text-xs text-zinc-500 dark:text-stone-400">Conta de cliente</p>
            </div>
          </div>

          <div className="my-1 h-px bg-zinc-200 dark:bg-white/10" />

          <ul>
            {ITEMS.map(({ href, label, hint, Icon }) => (
              <li key={href}>
                <Link href={href} onClick={() => setOpen(false)} className={ITEM_CLASS}>
                  <Icon size={20} className="shrink-0 text-(--tenant-accent)" />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-zinc-900 dark:text-white">{label}</span>
                    <span className="block text-xs text-zinc-500 dark:text-stone-400">{hint}</span>
                  </span>
                  {href === "/minha-conta" && upcomingCount > 0 ? (
                    <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-(--tenant-accent-secondary) px-1 text-[11px] font-bold text-white">
                      {upcomingCount}
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>

          <div className="my-1 h-px bg-zinc-200 dark:bg-white/10" />

          <form action={logoutConsumerAction}>
            <button type="submit" className={ITEM_CLASS}>
              <SignOut size={20} className="shrink-0 text-zinc-500 dark:text-stone-400" />
              <span className="text-sm font-semibold text-zinc-700 dark:text-stone-200">Sair</span>
            </button>
          </form>
        </motion.div>
      ) : null}
      </AnimatePresence>
    </div>
  );
}
