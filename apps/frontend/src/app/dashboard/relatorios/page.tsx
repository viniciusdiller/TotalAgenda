import Form from "next/form";
import { PageHeader } from "@/components/ui/PageHeader";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { getGeneralBalanceReport } from "./actions";
import { DateTime } from "luxon";
import { brl } from "@/lib/money";

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ReportsPage(props: PageProps) {
  const searchParams = await props.searchParams;

  const today = DateTime.local().setZone("America/Sao_Paulo");
  const firstDayOfMonth = today.startOf("month");

  const startDate = typeof searchParams.startDate === "string" ? searchParams.startDate : firstDayOfMonth.toISODate()!;
  const endDate = typeof searchParams.endDate === "string" ? searchParams.endDate : today.toISODate()!;

  const startISO = DateTime.fromISO(startDate, { zone: "America/Sao_Paulo" }).startOf("day").toUTC().toISO()!;
  const endISO = DateTime.fromISO(endDate, { zone: "America/Sao_Paulo" }).endOf("day").toUTC().toISO()!;

  const report = await getGeneralBalanceReport(startISO, endISO);

  return (
    <Container>
      <PageHeader
        title="Relatórios"
        description="Acompanhe o faturamento e desempenho operacional de forma simples e direta."
      />

      <div className="mt-8 space-y-8">
        <Form action="/dashboard/relatorios" className="flex flex-col items-end gap-3 sm:flex-row">
          <div className="w-full sm:w-auto">
            <Input
              name="startDate"
              type="date"
              label="Data inicial"
              defaultValue={startDate}
              required
            />
          </div>
          <div className="w-full sm:w-auto">
            <Input
              name="endDate"
              type="date"
              label="Data final"
              defaultValue={endDate}
              required
            />
          </div>
          <Button type="submit" className="w-full sm:w-auto">
            Filtrar Período
          </Button>
        </Form>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Faturamento</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card
              label="Faturamento Total"
              value={brl(report.totalRevenueCents)}
              tone="positive"
            />
            <Card
              label="Ticket Médio"
              value={brl(report.averageTicketCents)}
              tone="muted"
            />
            <Card
              label="Comandas Concluídas"
              value={report.totalTickets.toString()}
              tone="muted"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Operacional e Vendas</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              label="Total de Serviços"
              value={report.totalServices.toString()}
              tone="muted"
            />
            <Card
              label="Total de Produtos"
              value={report.totalProducts.toString()}
              tone="muted"
            />
            <Card
              label="Serviço Mais Pedido"
              value={report.mostRequestedService?.count?.toString() || "0"}
              hint={report.mostRequestedService?.name || "Nenhum"}
              tone="muted"
            />
            <Card
              label="Produto Mais Vendido"
              value={report.mostSoldProduct?.count?.toString() || "0"}
              hint={report.mostSoldProduct?.name || "Nenhum"}
              tone="muted"
            />
          </div>
        </div>
      </div>
    </Container>
  );
}
