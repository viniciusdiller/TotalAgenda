import { ManageBooking } from "@/components/booking/ManageBooking";

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <main className="min-h-dvh bg-stone-50 px-6 py-16 dark:bg-zinc-950">
      <ManageBooking token={token} />
    </main>
  );
}
