import { redirect } from "next/navigation";

// O login do cliente agora é o mesmo de todos (/entrar). Mantém links antigos funcionando.
export default async function LegacyConsumerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  redirect(next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar");
}
