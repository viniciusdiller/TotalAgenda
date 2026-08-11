import clsx from "clsx";

const STEP_LABELS = ["Serviço", "Profissional", "Horário", "Seus dados"];

export function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <ol className="flex items-center gap-2">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const state = step === currentStep ? "current" : step < currentStep ? "done" : "upcoming";

        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <div className="flex flex-1 flex-col gap-1.5">
              <div
                className={clsx(
                  "h-1.5 rounded-full transition-colors",
                  state === "upcoming" ? "bg-zinc-200 dark:bg-white/10" : "bg-accent-500",
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
            </div>
          </li>
        );
      })}
    </ol>
  );
}
