import { redirect } from "next/navigation";

// A home do painel é a agenda (grade de horários).
export default function DashboardHomePage() {
  redirect("/dashboard/agenda");
}
