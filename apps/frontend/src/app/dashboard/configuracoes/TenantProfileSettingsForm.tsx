"use client";

import { useActionState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  updateTenantProfileAction,
  uploadLogoAction,
  removeLogoAction,
  type UpdateProfileState,
  type UploadLogoState,
} from "./actions";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface TenantProfile {
  description: string | null;
  address: string | null;
  businessHours: string | null;
  logoUrl: string | null;
  accentColor: string | null;
}

const profileInitialState: UpdateProfileState = {};
const uploadInitialState: UploadLogoState = {};

export function TenantProfileSettingsForm({ tenant }: { tenant: TenantProfile }) {
  const [profileState, profileAction, profilePending] = useActionState(
    updateTenantProfileAction,
    profileInitialState,
  );
  const [uploadState, uploadFormAction, uploadPending] = useActionState(
    uploadLogoAction,
    uploadInitialState,
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="rounded-2xl border border-zinc-200 p-5 dark:border-white/10">
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Logo</p>
        <p className="mt-1 text-sm text-zinc-500 dark:text-stone-400">
          Aparece na página pública do seu negócio.
        </p>

        <div className="mt-4 flex items-center gap-4">
          {tenant.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${API_URL}${tenant.logoUrl}`}
              alt="Logo do negócio"
              className="h-16 w-16 rounded-xl object-cover ring-1 ring-zinc-900/5 dark:ring-white/10"
            />
          ) : (
            <div className="h-16 w-16 rounded-xl bg-zinc-100 dark:bg-white/5" />
          )}

          <form action={uploadFormAction} className="flex items-center gap-3">
            <input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              className="text-sm text-zinc-600 dark:text-stone-300"
            />
            <Button type="submit" variant="ghost" disabled={uploadPending} className="text-sm">
              {uploadPending ? "Enviando..." : "Enviar"}
            </Button>
          </form>

          {tenant.logoUrl ? (
            <form action={removeLogoAction}>
              <button
                type="submit"
                className="text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400"
              >
                Remover
              </button>
            </form>
          ) : null}
        </div>

        {uploadState?.error ? (
          <p className="mt-2 text-sm text-red-600 dark:text-red-400">{uploadState.error}</p>
        ) : null}
      </div>

      <form
        action={profileAction}
        className="flex flex-col gap-4 rounded-2xl border border-zinc-200 p-5 dark:border-white/10"
      >
        <p className="text-sm font-semibold text-zinc-900 dark:text-white">Perfil público</p>

        <Input
          label="Descrição"
          name="description"
          defaultValue={tenant.description ?? ""}
          placeholder="Cortes modernos e atendimento personalizado."
        />
        <Input
          label="Endereço"
          name="address"
          defaultValue={tenant.address ?? ""}
          placeholder="Rua Exemplo, 123 - Centro"
        />
        <Input
          label="Horário de funcionamento"
          name="businessHours"
          defaultValue={tenant.businessHours ?? ""}
          placeholder="Seg-Sex 9h-19h, Sáb 9h-13h"
        />

        <div className="flex flex-col gap-1.5">
          <label htmlFor="accentColor" className="text-sm font-medium text-zinc-700 dark:text-stone-200">
            Cor de destaque
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              id="accentColor"
              name="accentColor"
              defaultValue={tenant.accentColor ?? "#c2255c"}
              className="h-10 w-14 cursor-pointer rounded-lg border border-zinc-300 dark:border-white/15"
            />
            <p className="text-sm text-zinc-500 dark:text-stone-400">
              Usada nos botões e destaques da sua página pública.
            </p>
          </div>
        </div>

        {profileState?.error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{profileState.error}</p>
        ) : null}
        {profileState?.success ? (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">Salvo.</p>
        ) : null}

        <div>
          <Button type="submit" disabled={profilePending} className="disabled:opacity-60">
            {profilePending ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
