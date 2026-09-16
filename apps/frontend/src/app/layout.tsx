import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope, Outfit } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";

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

// Só pro wordmark da marca (components/brand/Logo.tsx) — não substitui --font-display,
// que segue usado nos headings do site inteiro.
const brand = Outfit({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: ["700"],
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

// Roda antes do React hidratar — aplica a classe .dark antes do primeiro paint, pra
// não piscar o tema errado. Padrão é sempre claro pra visita nova (não segue mais a
// preferência do SO) — só fica escuro se o usuário já escolheu isso antes.
const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("theme");
    document.documentElement.classList.toggle("dark", stored === "dark");
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${display.variable} ${body.variable} ${brand.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-dvh bg-stone-50 font-body text-zinc-900 antialiased dark:bg-zinc-950 dark:text-stone-100">
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
