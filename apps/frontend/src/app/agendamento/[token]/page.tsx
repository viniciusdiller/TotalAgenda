import { ManageBooking } from "@/components/booking/ManageBooking";
import { Footer } from "@/components/marketing/Footer";
import { SiteHeader } from "@/components/account/SiteHeader";

export default async function ManageBookingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1 bg-stone-50 px-6 py-16 dark:bg-zinc-950">
        <ManageBooking token={token} />
      </main>
      <Footer />
    </div>
  );
}
