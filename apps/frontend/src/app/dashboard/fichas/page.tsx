import { redirect } from "next/navigation";
import type { IntakeFormSummary } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { FormsManager } from "./FormsManager";

export default async function FichasPage() {
  const session = await auth();
  if (session?.user.role !== "OWNER") {
    redirect("/dashboard");
  }

  const forms = await authedFetch<IntakeFormSummary[]>("/intake/forms").catch(() => []);

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
        Fichas de anamnese
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
        Modelos de ficha preenchidos por cliente na tela de cada cliente.
      </p>

      <FormsManager initialForms={forms} />
    </div>
  );
}
