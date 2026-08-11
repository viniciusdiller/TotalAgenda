"use client";

import { DateTime } from "luxon";
import type { PublicProfessional, PublicService } from "@totalagenda/shared-types";
import { Input } from "../ui/Input";

const TIMEZONE = "America/Sao_Paulo";

export function ClientInfoStep({
  service,
  professional,
  startAt,
  clientName,
  clientPhone,
  onChangeName,
  onChangePhone,
  errors,
}: {
  service: PublicService;
  professional: PublicProfessional;
  startAt: string;
  clientName: string;
  clientPhone: string;
  onChangeName: (value: string) => void;
  onChangePhone: (value: string) => void;
  errors: { clientName?: string; clientPhone?: string };
}) {
  const formattedDate = DateTime.fromISO(startAt)
    .setZone(TIMEZONE)
    .setLocale("pt-BR")
    .toFormat("cccc, d 'de' LLLL 'às' HH:mm");

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl border border-zinc-200 p-4 dark:border-white/10">
        <p className="font-display font-semibold text-zinc-900 dark:text-white">{service.name}</p>
        <p className="mt-1 text-sm text-zinc-600 dark:text-stone-300">
          Com {professional.name}
        </p>
        <p className="mt-1 text-sm text-zinc-600 capitalize dark:text-stone-300">
          {formattedDate}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <Input
          label="Seu nome"
          name="clientName"
          placeholder="Como podemos te chamar"
          value={clientName}
          onChange={(e) => onChangeName(e.target.value)}
          error={errors.clientName}
          autoComplete="name"
        />
        <Input
          label="Seu telefone"
          name="clientPhone"
          type="tel"
          placeholder="(11) 91234-5678"
          value={clientPhone}
          onChange={(e) => onChangePhone(e.target.value)}
          error={errors.clientPhone}
          autoComplete="tel"
          hint="Usamos para o profissional entrar em contato se precisar."
        />
      </div>
    </div>
  );
}
