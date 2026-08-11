"use server";

import { revalidatePath } from "next/cache";
import { authedFetch } from "@/lib/api-server";
import { ApiError } from "@/lib/api";

export interface WorkingHoursInterval {
  weekday: string;
  startMinute: number;
  endMinute: number;
}

export interface ActionState {
  error?: string;
}

export async function updateWorkingHoursAction(
  professionalId: string,
  intervals: WorkingHoursInterval[],
): Promise<ActionState> {
  try {
    await authedFetch(`/professionals/${professionalId}/working-hours`, {
      method: "PUT",
      body: JSON.stringify({ intervals }),
    });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Não foi possível salvar." };
  }
  revalidatePath(`/dashboard/profissionais/${professionalId}`);
  return {};
}

export async function toggleServiceLinkAction(
  professionalId: string,
  serviceId: string,
  isActive: boolean,
) {
  await authedFetch(`/professionals/${professionalId}/services`, {
    method: "POST",
    body: JSON.stringify({ serviceId, isActive }),
  });
  revalidatePath(`/dashboard/profissionais/${professionalId}`);
}

export interface CreateTimeBlockState {
  error?: string;
}

export async function createTimeBlockAction(
  professionalId: string,
  _prevState: CreateTimeBlockState | undefined,
  formData: FormData,
): Promise<CreateTimeBlockState> {
  const date = formData.get("date");
  const startTime = formData.get("startTime");
  const endTime = formData.get("endTime");

  if (!date || !startTime || !endTime) {
    return { error: "Preencha data, início e fim." };
  }

  const startAt = new Date(`${date}T${startTime}:00`);
  const endAt = new Date(`${date}T${endTime}:00`);

  if (endAt <= startAt) {
    return { error: "O horário de término deve ser depois do início." };
  }

  try {
    await authedFetch("/time-blocks", {
      method: "POST",
      body: JSON.stringify({
        professionalId,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString(),
        reason: formData.get("reason") || undefined,
      }),
    });
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : "Não foi possível bloquear." };
  }

  revalidatePath(`/dashboard/profissionais/${professionalId}`);
  return {};
}

export async function deleteTimeBlockAction(professionalId: string, blockId: string) {
  await authedFetch(`/time-blocks/${blockId}`, { method: "DELETE" });
  revalidatePath(`/dashboard/profissionais/${professionalId}`);
}
