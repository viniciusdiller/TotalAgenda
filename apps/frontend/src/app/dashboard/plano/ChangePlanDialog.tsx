"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import type { PlanChangePreview, PlanTier } from "@/lib/billing";
import { changePlanAction, previewPlanChangeAction } from "./actions";

export function ChangePlanDialog({
  tier,
  planName,
  onClose,
}: {
  tier: PlanTier;
  planName: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [preview, setPreview] = useState<PlanChangePreview | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [understood, setUnderstood] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // <dialog> nativo: foco preso, Esc fecha e o resto da página fica inerte.
  useEffect(() => {
    dialogRef.current?.showModal();
    let cancelled = false;
    previewPlanChangeAction(tier).then((result) => {
      if (cancelled) return;
      if ("error" in result) setLoadError(result.error);
      else setPreview(result.preview);
    });
    return () => {
      cancelled = true;
    };
  }, [tier]);

  const excess = preview?.excess ?? 0;
  const valid = preview !== null && selected.size === excess && understood;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirm() {
    setError(null);
    startTransition(async () => {
      const result = await changePlanAction(tier, [...selected]);
      if ("error" in result) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="change-plan-title"
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-black/50 dark:border-white/10 dark:bg-zinc-900 dark:text-white"
    >
      <h2 id="change-plan-title" className="font-display text-xl font-bold">
        Trocar para o plano {planName}
      </h2>

      {loadError ? (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
          {loadError}
        </p>
      ) : !preview ? (
        <p className="mt-4 text-sm text-zinc-500 dark:text-stone-400">Verificando o que a troca exige...</p>
      ) : (
        <div className="mt-4 flex flex-col gap-4 text-sm">
          <div className="rounded-lg bg-zinc-50 p-3 text-zinc-600 dark:bg-white/5 dark:text-stone-300">
            <p className="font-semibold text-zinc-900 dark:text-white">A troca vale agora.</p>
            <p className="mt-1">
              {preview.direction === "UPGRADE"
                ? "A diferença de preço é calculada proporcionalmente ao que resta do período já pago e entra na sua próxima fatura."
                : "O valor que você já pagou e não vai usar do plano atual é abatido, proporcionalmente, como crédito na sua próxima fatura."}
            </p>
            <p className="mt-1">
              O plano {planName} permite {preview.newLimit === null ? "profissionais ilimitados" : `até ${preview.newLimit} profissionais`}.
            </p>
          </div>

          {excess > 0 ? (
            <div>
              <p className="font-semibold">
                Você tem {preview.activeCount} profissionais ativos. Escolha {excess} para desativar:
              </p>
              <ul className="mt-2 flex flex-col divide-y divide-zinc-200 rounded-lg border border-zinc-200 dark:divide-white/10 dark:border-white/10">
                {preview.professionals.map((professional) => {
                  const checked = selected.has(professional.id);
                  const locked = !professional.canDeactivate;
                  const full = !checked && selected.size >= excess;
                  return (
                    <li key={professional.id} className="flex items-start gap-3 p-3">
                      <input
                        id={`prof-${professional.id}`}
                        type="checkbox"
                        checked={checked}
                        disabled={locked || full || isPending}
                        onChange={() => toggle(professional.id)}
                        className="mt-1"
                      />
                      <label htmlFor={`prof-${professional.id}`} className={locked ? "opacity-60" : undefined}>
                        <span className="font-medium">{professional.name}</span>
                        <span className="block text-xs text-zinc-500 dark:text-stone-400">{professional.email}</span>
                        {locked ? (
                          <span className="mt-1 block text-xs text-amber-700 dark:text-amber-300">
                            Tem {professional.futureAppointments} agendamento(s) futuro(s). Cancele ou remarque antes de
                            desativar.
                          </span>
                        ) : null}
                      </label>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-xs text-zinc-500 dark:text-stone-400">
                Selecionados: {selected.size} de {excess}.
              </p>

              <p
                role="note"
                className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:border-amber-400/40 dark:bg-amber-400/10 dark:text-amber-100"
              >
                <strong>Atenção:</strong> os profissionais desativados deixam de aparecer para agendamento e não podem
                ser reativados enquanto o limite do plano estiver cheio. O histórico deles (agenda passada, comissões
                e caixa) é preservado.
              </p>
            </div>
          ) : null}

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={understood}
              onChange={(e) => setUnderstood(e.target.checked)}
              disabled={isPending}
              className="mt-1"
            />
            <span>
              Entendi que a troca vale agora{excess > 0 ? " e que os profissionais selecionados serão desativados" : ""}.
            </span>
          </label>

          {error ? (
            <p role="alert" className="text-red-600 dark:text-red-400">
              {error}
            </p>
          ) : null}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => dialogRef.current?.close()} disabled={isPending}>
          Cancelar
        </Button>
        <Button type="button" onClick={confirm} disabled={!valid || isPending} className="disabled:opacity-50">
          {isPending ? "Trocando..." : "Confirmar troca"}
        </Button>
      </div>
    </dialog>
  );
}
