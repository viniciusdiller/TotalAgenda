"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowLeft, CalendarCheck, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { Container } from "../ui/Container";
import { Logo } from "../brand/Logo";

function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
}

// Mesmo padrão do Nav.tsx da home (fixed + transparente no topo, ganha fundo com blur
// só depois de rolar) — reaproveitado aqui pra a marca ter o mesmo peso visual que tem
// no site principal, em vez de um selo pequeno num canto. Sem os links de marketing
// (Como funciona/Recursos/FAQ não existem nessa rota); só a marca e a volta pro
// /descobrir, que sai do corpo da hero pra não duplicar.
export function TenantTopBar({
  slug,
  client,
}: {
  slug: string;
  client: { name: string; upcomingCount: number } | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 8);
  });

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="relative">
        <motion.div
          aria-hidden
          initial={false}
          animate={{ opacity: scrolled ? 1 : 0 }}
          transition={{ duration: 0.25 }}
          className="absolute inset-0 border-b border-zinc-900/8 bg-stone-50/80 backdrop-blur-md dark:border-white/10 dark:bg-zinc-950/80"
        />
        <Container className="relative flex h-16 items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <Logo markSize={28} />
          </Link>

          {client ? (
            <div className="flex items-center gap-2.5">
              <Link
                href="/minha-conta"
                className="relative inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:border-(--tenant-accent)/40 dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                <CalendarCheck size={17} className="text-(--tenant-accent)" />
                <span className="hidden sm:inline">Compromissos</span>
                {client.upcomingCount > 0 ? (
                  <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-(--tenant-accent-secondary) px-1 text-[11px] font-bold text-white">
                    {client.upcomingCount}
                  </span>
                ) : null}
              </Link>
              <Link
                href="/minha-conta"
                className="flex items-center gap-2.5 rounded-full border border-zinc-200 py-1.5 pr-3 pl-1.5 transition-colors hover:border-(--tenant-accent)/40 dark:border-white/10"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--tenant-accent) font-brand text-[13px] font-bold text-white">
                  {initials(client.name)}
                </span>
                <span className="hidden flex-col leading-tight sm:flex">
                  <span className="text-[13px] font-semibold text-zinc-900 dark:text-white">
                    {client.name.split(" ")[0]}
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-stone-400">Meu Cadastro</span>
                </span>
                <CaretDown size={13} className="hidden text-zinc-400 sm:block" />
              </Link>
            </div>
          ) : (
            <div className="flex items-center gap-5">
              <Link
                href="/descobrir"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-stone-300 dark:hover:text-white"
              >
                <ArrowLeft size={16} />
                Descobrir
              </Link>
              <Link
                href={`/minha-conta/entrar?next=${encodeURIComponent(`/${slug}`)}`}
                className="rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-900 transition-colors hover:border-(--tenant-accent)/40 dark:border-white/10 dark:bg-white/5 dark:text-white"
              >
                Entrar
              </Link>
            </div>
          )}
        </Container>
      </div>
    </header>
  );
}
