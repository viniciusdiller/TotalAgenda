"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { List, X } from "@phosphor-icons/react/dist/ssr";
import { Container } from "../ui/Container";
import { Button } from "../ui/Button";

const links = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#planos", label: "Planos" },
  { href: "#faq", label: "Perguntas" },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
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
        <Container className="relative">
          <nav className="flex h-16 items-center justify-between">
            <a href="#top" className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
              TotalAgenda
            </a>

            <ul className="hidden items-center gap-8 lg:flex">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900 dark:text-stone-300 dark:hover:text-white"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>

            <div className="hidden items-center gap-3 lg:flex">
              <Link
                href="/entrar"
                className="text-sm font-semibold text-zinc-700 hover:text-zinc-900 dark:text-stone-200 dark:hover:text-white"
              >
                Entrar
              </Link>
              <Button href="/cadastro" className="px-5 py-2.5 text-sm">
                Começar grátis
              </Button>
            </div>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="p-2 text-zinc-700 lg:hidden dark:text-white"
              aria-label={open ? "Fechar menu" : "Abrir menu"}
            >
              {open ? <X size={22} /> : <List size={22} />}
            </button>
          </nav>
        </Container>
      </div>

      {open ? (
        <div className="border-b border-zinc-900/8 bg-stone-50/95 backdrop-blur-md lg:hidden dark:border-white/10 dark:bg-zinc-950/95">
          <Container className="flex flex-col gap-1 py-4">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-900/5 dark:text-stone-200 dark:hover:bg-white/5"
              >
                {link.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 px-3">
              <Link href="/entrar" className="text-sm font-semibold text-zinc-700 dark:text-stone-200">
                Entrar
              </Link>
              <Button href="/cadastro" className="w-full">
                Começar grátis
              </Button>
            </div>
          </Container>
        </div>
      ) : null}
    </header>
  );
}
