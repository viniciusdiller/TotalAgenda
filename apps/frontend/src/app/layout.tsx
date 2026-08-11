import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope } from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const body = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "TotalAgenda - Agenda online para salões e barbearias",
  description:
    "Cada profissional com sua própria agenda online. Cliente marca pelo link, sem criar conta. Teste grátis por 14 dias, sem cartão.",
  keywords: [
    "agenda online",
    "agendamento para salão",
    "sistema de agendamento barbearia",
    "software para salão de beleza",
  ],
  openGraph: {
    title: "TotalAgenda - Agenda online para salões e barbearias",
    description:
      "Cada profissional com sua própria agenda online. Cliente marca pelo link, sem criar conta.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${display.variable} ${body.variable}`}>
      <body className="min-h-dvh bg-stone-50 font-body text-zinc-900 antialiased dark:bg-zinc-950 dark:text-stone-100">
        {children}
      </body>
    </html>
  );
}
