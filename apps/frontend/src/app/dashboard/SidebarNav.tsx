"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { motion } from "motion/react";
import {
  CalendarBlank,
  CashRegister,
  ChartLineUp,
  ClipboardText,
  ClockCounterClockwise,
  CreditCard,
  Gear,
  IdentificationCard,
  Package,
  Percent,
  Receipt,
  Scissors,
  Storefront,
  Users,
} from "@phosphor-icons/react/dist/ssr";

interface NavLink {
  href: string;
  label: string;
  icon: typeof CalendarBlank;
}

// Agrupado por fluxo de trabalho (não ordem alfabética) — com 14 destinos, uma lista plana
// vira uma parede de texto; o dono escaneia por "o que eu vim fazer agora", não por nome.
const sections: { label: string; links: NavLink[] }[] = [
  {
    label: "Operação do dia",
    links: [
      { href: "/dashboard/agenda", label: "Agenda", icon: CalendarBlank },
      { href: "/dashboard/comandas", label: "Comandas", icon: Receipt },
      { href: "/dashboard/caixa", label: "Caixa", icon: CashRegister },
      { href: "/dashboard/lista-espera", label: "Lista de espera", icon: ClockCounterClockwise },
    ],
  },
  {
    label: "Clientes",
    links: [
      { href: "/dashboard/clientes", label: "Clientes", icon: IdentificationCard },
      { href: "/dashboard/fichas", label: "Fichas", icon: ClipboardText },
    ],
  },
  {
    label: "Catálogo",
    links: [
      { href: "/dashboard/servicos", label: "Serviços", icon: Scissors },
      { href: "/dashboard/produtos", label: "Produtos", icon: Package },
    ],
  },
  {
    label: "Equipe e financeiro",
    links: [
      { href: "/dashboard/profissionais", label: "Profissionais", icon: Users },
      { href: "/dashboard/comissoes", label: "Comissões", icon: Percent },
      { href: "/dashboard/financeiro", label: "Financeiro", icon: ChartLineUp },
    ],
  },
  {
    label: "Negócio",
    links: [
      { href: "/dashboard/marketplace", label: "Marketplace", icon: Storefront },
      { href: "/dashboard/plano", label: "Plano e cobrança", icon: CreditCard },
      { href: "/dashboard/configuracoes", label: "Configurações", icon: Gear },
    ],
  },
];

interface SidebarNavProps {
  onNavigate?: () => void;
  // O <aside> desktop fica montado no DOM mesmo escondido por CSS no mobile (hidden md:block
  // não desmonta). Com o drawer mobile renderizando outra instância ao mesmo tempo, duas
  // <motion.span layoutId="sidebar-active"> simultâneas faziam o motion tentar animar UMA
  // pill entre os dois lugares — e travava a entrada do drawer e do backdrop junto.
  scope?: "desktop" | "mobile";
}

export function SidebarNav({ onNavigate, scope = "desktop" }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-5">
      {sections.map((section) => (
        <div key={section.label}>
          <p className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase dark:text-stone-500">
            {section.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.links.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={onNavigate}
                  className={clsx(
                    "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "text-accent-700 dark:text-accent-300"
                      : "text-zinc-600 hover:bg-zinc-900/5 dark:text-stone-300 dark:hover:bg-white/5",
                  )}
                >
                  {isActive ? (
                    <motion.span
                      layoutId={`sidebar-active-${scope}`}
                      aria-hidden
                      className="absolute inset-0 rounded-xl bg-accent-50 dark:bg-accent-500/10"
                      transition={{ type: "spring", stiffness: 500, damping: 38 }}
                    />
                  ) : null}
                  <link.icon size={18} weight={isActive ? "fill" : "regular"} className="relative" />
                  <span className="relative">{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
