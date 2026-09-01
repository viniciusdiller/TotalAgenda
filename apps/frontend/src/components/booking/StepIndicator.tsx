import clsx from "clsx";

const STEP_LABELS = ["Serviço", "Profissional", "Horário", "Seus dados"];

export function StepIndicator({
  currentStep,
  onStepClick,
}: {
  currentStep: number;
  // Só chamado para passos já concluídos (state === "done") — os dados deles já foram
  // carregados, então voltar direto pra lá é seguro; passos futuros ficam sem onClick.
  onStepClick?: (step: number) => void;
}) {
  return (
    <ol className="flex items-center gap-2">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const state = step === currentStep ? "current" : step < currentStep ? "done" : "upcoming";
        const clickable = state === "done" && !!onStepClick;

        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onStepClick?.(step)}
              aria-current={state === "current" ? "step" : undefined}
              className={clsx(
                "flex flex-1 flex-col gap-1.5 rounded-md text-left",
                clickable && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-(--tenant-accent)/40",
              )}
            >
              <div
                className={clsx(
                  "h-1.5 rounded-full transition-colors",
                  state === "upcoming" ? "bg-zinc-200 dark:bg-white/10" : "bg-(--tenant-accent)",
                )}
              />
              <span
                className={clsx(
                  "hidden text-xs font-medium sm:block",
                  state === "current"
                    ? "text-zinc-900 dark:text-white"
                    : "text-zinc-400 dark:text-stone-500",
                )}
              >
                {label}
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
