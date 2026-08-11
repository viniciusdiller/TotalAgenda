"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { CalendarCheck, LinkSimple } from "@phosphor-icons/react/dist/ssr";
import { Container } from "../ui/Container";
import { Button } from "../ui/Button";

export function Hero() {
  const reduce = useReducedMotion();

  return (
    <section id="top" className="relative overflow-hidden pt-24 pb-20 lg:pb-28">
      <Container>
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <div>
            <motion.h1
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-4xl font-bold tracking-tight text-balance text-zinc-900 md:text-5xl lg:text-6xl dark:text-white"
            >
              A agenda do seu salão,{" "}
              <span className="text-accent-500">sem trocar mensagem</span>.
            </motion.h1>

            <motion.p
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="mt-6 max-w-[46ch] text-lg leading-relaxed text-zinc-600 dark:text-stone-300"
            >
              Cada profissional tem sua própria agenda online, com link para
              clientes marcarem sozinhos. Teste grátis por 14 dias, sem
              cartão.
            </motion.p>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Button href="/cadastro">Começar grátis</Button>
              <Button href="#como-funciona" variant="ghost">
                Ver como funciona
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={reduce ? false : { opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-zinc-100 shadow-2xl shadow-zinc-900/10 dark:bg-zinc-900">
              <Image
                src="https://picsum.photos/seed/totalagenda-studio/900/1125"
                alt="Interior de um salão de beleza"
                fill
                priority
                sizes="(min-width: 1024px) 480px, 90vw"
                className="object-cover"
              />
            </div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="absolute -left-6 bottom-8 hidden w-56 rounded-2xl bg-white/95 p-4 shadow-xl ring-1 ring-zinc-900/5 backdrop-blur sm:block dark:bg-zinc-900/95 dark:ring-white/10"
            >
              <div className="flex items-center gap-2 text-accent-600 dark:text-accent-300">
                <CalendarCheck size={20} weight="fill" />
                <span className="text-sm font-semibold">Agendado</span>
              </div>
              <p className="mt-1 text-sm text-zinc-600 dark:text-stone-300">
                Corte + Barba com Carlos, quinta às 15h
              </p>
            </motion.div>

            <motion.div
              initial={reduce ? false : { opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.65 }}
              className="absolute -right-4 top-8 hidden items-center gap-2 rounded-full bg-white/95 px-4 py-2.5 shadow-xl ring-1 ring-zinc-900/5 backdrop-blur sm:flex dark:bg-zinc-900/95 dark:ring-white/10"
            >
              <LinkSimple size={16} className="text-zinc-500 dark:text-stone-400" />
              <span className="text-xs font-medium text-zinc-700 dark:text-stone-200">
                totalagenda.com/studio-da-ana
              </span>
            </motion.div>
          </motion.div>
        </div>
      </Container>
    </section>
  );
}
