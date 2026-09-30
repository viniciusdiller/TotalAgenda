import type { IntakeFormSummary } from "@totalagenda/shared-types";
import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { requireRole } from "@/lib/guards";
import { PageHeader } from "@/components/ui/PageHeader";
import { FormsManager } from "./FormsManager";

export default async function FichasPage() {
  const session = await auth();
  requireRole(session, ["OWNER"]);

  const forms = await authedFetch<IntakeFormSummary[]>("/intake/forms").catch(() => []);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Fichas de anamnese"
        description="Modelos de ficha preenchidos por cliente na tela de cada cliente."
      />

      <FormsManager initialForms={forms} />
    </div>
  );
}
