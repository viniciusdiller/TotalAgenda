import "server-only";

import { authedFetch } from "@/lib/api-server";

export interface GeneralBalanceReport {
  totalServices: number;
  mostRequestedService: { name: string; count: number } | null;
  totalProducts: number;
  mostSoldProduct: { name: string; count: number } | null;
}

export async function getGeneralBalanceReport(startDate: string, endDate: string) {
  const searchParams = new URLSearchParams({ startDate, endDate });
  return authedFetch<GeneralBalanceReport>(`/reports/general?${searchParams.toString()}`);
}
