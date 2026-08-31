"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { CaretLeft, Star } from "@phosphor-icons/react/dist/ssr";
import type { ReviewablePastAppointment } from "@totalagenda/shared-types";
import { ApiError } from "@/lib/api";
import {
  consumerApi,
  getConsumerToken,
  setConsumerToken,
} from "@/lib/marketplace-api";

function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" onClick={() => onChange(n)} aria-label={`${n} estrelas`}>
          <Star size={24} weight={n <= value ? "fill" : "regular"} className="text-amber-500" />
        </button>
      ))}
    </div>
  );
}

export default function AvaliarPage() {
  const [authed, setAuthed] = useState(false);
  const [checking, setChecking] = useState(true);

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [pending, setPending] = useState<ReviewablePastAppointment[]>([]);
  const [rating, setRating] = useState<Record<string, number>>({});
  const [comment, setComment] = useState<Record<string, string>>({});
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!getConsumerToken()) {
      setChecking(false);
      return;
    }
    consumerApi
      .me()
      .then(() => {
        setAuthed(true);
        return consumerApi.pendingReviews().then(setPending);
      })
      .catch(() => setConsumerToken(null))
      .finally(() => setChecking(false));
  }, []);

  async function submitAuth(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    try {
      const session =
        mode === "login"
          ? await consumerApi.login(phone)
          : await consumerApi.register({ name, phone, consent });
      setConsumerToken(session.accessToken);
      setAuthed(true);
      setPending(await consumerApi.pendingReviews());
    } catch (err) {
      setAuthError(err instanceof ApiError ? err.message : "Erro.");
    }
  }

  async function submitReview(appointmentId: string) {
    setMsg(null);
    try {
      await consumerApi.submitReview({
        appointmentId,
        rating: rating[appointmentId] ?? 5,
        comment: comment[appointmentId]?.trim() || undefined,
      });
      setDone((d) => ({ ...d, [appointmentId]: true }));
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Erro ao enviar.");
    }
  }

  if (checking) return <main className="mx-auto max-w-md px-4 py-10 text-sm">Carregando...</main>;

  return (
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

      {!authed ? (
        <form onSubmit={submitAuth} className="mt-6 space-y-3">
          <div className="flex gap-2 text-sm">
            <button
              type="button"
              onClick={() => setMode("login")}
              className={mode === "login" ? "font-semibold text-accent-600" : "text-zinc-400"}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => setMode("register")}
              className={mode === "register" ? "font-semibold text-accent-600" : "text-zinc-400"}
            >
              Criar conta
            </button>
          </div>

          {mode === "register" ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              required
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
            />
          ) : null}
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Telefone (DDD + número)"
            inputMode="tel"
            required
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
          />
          {mode === "register" ? (
            <label className="flex items-start gap-2 text-xs text-zinc-500 dark:text-stone-400">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                required
              />
              Aceito os termos de uso e a política de privacidade. Meus dados serão usados só
              para identificar minhas visitas e avaliações.
            </label>
          ) : null}
          {authError ? <p className="text-sm text-red-600">{authError}</p> : null}
          <button
            type="submit"
            className="rounded-full bg-accent-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-600"
          >
            {mode === "login" ? "Entrar" : "Criar conta"}
          </button>
        </form>
      ) : pending.length === 0 ? (
        <p className="mt-6 text-sm text-zinc-500 dark:text-stone-400">
          Nenhuma visita concluída aguardando avaliação.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {pending.map((a) => (
            <li key={a.id} className="rounded-xl border border-zinc-200 p-4 dark:border-white/10">
              <p className="font-medium text-zinc-900 dark:text-white">{a.tenant.name}</p>
              <p className="text-xs text-zinc-400">
                {a.items.map((i) => i.service.name).join(", ")} ·{" "}
                {DateTime.fromISO(a.startAt).setLocale("pt-BR").toFormat("dd/LL/yyyy")}
              </p>
              {done[a.id] ? (
                <p className="mt-2 text-sm text-emerald-600 dark:text-emerald-400">
                  Avaliação enviada. Obrigado!
                </p>
              ) : (
                <div className="mt-3 space-y-2">
                  <Stars
                    value={rating[a.id] ?? 5}
                    onChange={(n) => setRating((r) => ({ ...r, [a.id]: n }))}
                  />
                  <textarea
                    value={comment[a.id] ?? ""}
                    onChange={(e) => setComment((c) => ({ ...c, [a.id]: e.target.value }))}
                    placeholder="Comentário (opcional)"
                    rows={2}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => submitReview(a.id)}
                    className="rounded-full bg-accent-500 px-5 py-2 text-sm font-semibold text-white hover:bg-accent-600"
                  >
                    Enviar avaliação
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {msg ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{msg}</p> : null}
    </main>
  );
}
