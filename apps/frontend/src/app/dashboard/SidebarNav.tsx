"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  CalendarBlank,
  ClipboardText,
  ClockCounterClockwise,
  Gear,
  IdentificationCard,
  Scissors,
  Users,
} from "@phosphor-icons/react/dist/ssr";

const links = [
  { href: "/dashboard/agenda", label: "Agenda", icon: CalendarBlank },
  { href: "/dashboard/clientes", label: "Clientes", icon: IdentificationCard },
  { href: "/dashboard/profissionais", label: "Profissionais", icon: Users },
  { href: "/dashboard/servicos", label: "Serviços", icon: Scissors },
  { href: "/dashboard/lista-espera", label: "Lista de espera", icon: ClockCounterClockwise },
  { href: "/dashboard/fichas", label: "Fichas", icon: ClipboardText },
  { href: "/dashboard/configuracoes", label: "Configurações", icon: Gear },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {links.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={clsx(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300"
                : "text-zinc-600 hover:bg-zinc-900/5 dark:text-stone-300 dark:hover:bg-white/5",
            )}
          >
            <link.icon size={18} weight={isActive ? "fill" : "regular"} />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
