import { auth } from "@/lib/auth";
import { authedFetch } from "@/lib/api-server";
import { TenantProfileSettingsForm } from "./TenantProfileSettingsForm";
import { GalleryManager } from "./GalleryManager";

interface TenantMe {
  name: string;
  slug: string;
  description: string | null;
  address: string | null;
  businessHours: string | null;
  logoUrl: string | null;
  accentColor: string | null;
  whatsappNumber: string | null;
  instagramUrl: string | null;
  showServices: boolean;
  showTeam: boolean;
  showGallery: boolean;
  showContact: boolean;
  galleryImages: { id: string; url: string }[];
}

export default async function ConfiguracoesPage() {
  const session = await auth();
  const isOwner = session?.user.role === "OWNER";

  if (!isOwner) {
    return (
      <p className="text-sm text-zinc-500 dark:text-stone-400">
        Só o dono do negócio pode editar essas configurações.
      </p>
    );
  }

  const tenant = await authedFetch<TenantMe>("/tenants/me");

  return (
    <div>
      <h1 className="font-display text-2xl font-bold text-zinc-900 dark:text-white">
        Configurações
      </h1>
      <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
        Como seu negócio aparece em{" "}
        <span className="font-medium text-zinc-700 dark:text-stone-200">
          totalagenda.com/{tenant.slug}
        </span>
        .
      </p>

      <div className="mt-6 flex flex-col gap-8">
        <TenantProfileSettingsForm tenant={tenant} />
        <GalleryManager images={tenant.galleryImages} />
      </div>
    </div>
  );
}
