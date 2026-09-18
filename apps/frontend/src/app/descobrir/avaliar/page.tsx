import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import type { ReviewablePastAppointment } from "@totalagenda/shared-types";
import { consumerAuthedFetch } from "@/lib/consumer-session";
import { Footer } from "@/components/marketing/Footer";
import { ReviewList } from "./ReviewList";

export const metadata: Metadata = { title: "Avaliar visitas - TotalAgenda" };

export default async function AvaliarPage() {
  // Mesma conta global do resto do site (cookie httpOnly único) — sem sessão, vai pro login e
  // volta pra cá.
  const pending = await consumerAuthedFetch<ReviewablePastAppointment[]>(
    "/public/consumer/reviews/pending",
  ).catch(() => null);
  if (!pending) {
    redirect("/minha-conta/entrar?next=/descobrir/avaliar");
  }

  return (
    <>
      <main className="mx-auto max-w-md px-4 py-10">
        <Link
          href="/descobrir"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:text-stone-400 dark:hover:text-white"
        >
          <CaretLeft size={14} />
          Descobrir
        </Link>
        <h1 className="mt-3 font-display text-2xl font-bold text-zinc-900 dark:text-white">
          Avaliar visitas
        </h1>
        <ReviewList pending={pending} />
      </main>
      <Footer />
    </>
  );
}
