"use client";

import { useState, useTransition } from "react";
import { DateTime } from "luxon";
import { Star } from "@phosphor-icons/react/dist/ssr";
import type { OwnerReview } from "@totalagenda/shared-types";
import { hideReviewAction, reportReviewAction } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  VISIBLE: "Visível",
  HIDDEN: "Oculta",
  PENDING_REPORT: "Denunciada",
};

export function ReviewsModeration({ reviews }: { reviews: OwnerReview[] }) {
  const [isPending, startTransition] = useTransition();
  const [reporting, setReporting] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (reviews.length === 0) {
    return (
      <p className="mt-4 text-sm text-zinc-500 dark:text-stone-400">
        Nenhuma avaliação ainda.
      </p>
    );
  }

  return (
    <ul className="mt-4 space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-xl border border-zinc-200 p-3 dark:border-white/10">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} size={13} weight={i < r.rating ? "fill" : "regular"} />
              ))}
            </span>
            <span className="text-xs text-zinc-400">
              {STATUS_LABEL[r.status]} ·{" "}
              {DateTime.fromISO(r.createdAt).setLocale("pt-BR").toFormat("dd/LL/yyyy")}
            </span>
          </div>
          {r.comment ? (
            <p className="mt-2 text-sm text-zinc-700 dark:text-stone-300">{r.comment}</p>
          ) : null}
          <p className="mt-1 text-xs text-zinc-400">{r.consumer.name}</p>

          {r.status === "VISIBLE" ? (
            <div className="mt-2 flex items-center gap-3 text-xs">
              <button
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => void hideReviewAction(r.id))}
                className="font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-stone-200"
              >
                Ocultar
              </button>
              <button
                type="button"
                onClick={() => setReporting(reporting === r.id ? null : r.id)}
                className="font-medium text-red-600 dark:text-red-400"
              >
                Denunciar
              </button>
            </div>
          ) : null}

          {reporting === r.id ? (
            <div className="mt-2 flex gap-2">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Motivo da denúncia"
                className="flex-1 rounded-lg border border-zinc-300 px-2 py-1.5 text-sm dark:border-white/15 dark:bg-zinc-900 dark:text-white"
              />
              <button
                type="button"
                disabled={isPending || !reason.trim()}
                onClick={() =>
                  startTransition(async () => {
                    await reportReviewAction(r.id, reason.trim());
                    setReporting(null);
                    setReason("");
                  })
                }
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
