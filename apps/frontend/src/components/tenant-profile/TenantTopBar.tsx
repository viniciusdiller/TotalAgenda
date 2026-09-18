"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { Container } from "../ui/Container";
import { Logo } from "../brand/Logo";

// Mesmo padrão do Nav.tsx da home (fixed + transparente no topo, ganha fundo com blur
// só depois de rolar) — reaproveitado aqui pra a marca ter o mesmo peso visual que tem
// no site principal, em vez de um selo pequeno num canto. Sem os links de marketing
// (Como funciona/Recursos/FAQ não existem nessa rota); só a marca e a volta pro
// /descobrir, que sai do corpo da hero pra não duplicar.
export function TenantTopBar() {
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
        <Container className="relative flex h-16 items-center justify-between">
          <Link href="/">
            <Logo markSize={28} />
          </Link>

          <Link
            href="/descobrir"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-stone-300 dark:hover:text-white"
          >
            <ArrowLeft size={16} />
            Descobrir
          </Link>
        </Container>
      </div>
    </header>
  );
}
