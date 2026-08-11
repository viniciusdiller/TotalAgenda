import type {
  ApiErrorBody,
  AvailableSlot,
  CreateBookingInput,
  CreateWaitlistInput,
  PublicBooking,
  PublicProfessional,
  PublicService,
  PublicTenant,
} from "@totalagenda/shared-types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : (body?.message ?? "Erro inesperado ao comunicar com o servidor.");
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export const publicApi = {
  getTenant: (slug: string) => request<PublicTenant>(`/public/tenants/${slug}`),

  getServices: (slug: string) => request<PublicService[]>(`/public/tenants/${slug}/services`),

  getProfessionals: (slug: string, serviceId: string) =>
    request<PublicProfessional[]>(
      `/public/tenants/${slug}/professionals?serviceId=${encodeURIComponent(serviceId)}`,
    ),

  getAvailability: (slug: string, professionalId: string, serviceId: string, date: string) =>
    request<AvailableSlot[]>(
      `/public/tenants/${slug}/professionals/${professionalId}/availability?serviceId=${encodeURIComponent(
        serviceId,
      )}&date=${date}`,
    ),

  createBooking: (slug: string, input: CreateBookingInput) =>
    request<PublicBooking>(`/public/tenants/${slug}/bookings`, {
      method: "POST",
      body: JSON.stringify(input),
    }),

  getBookingByToken: (token: string) => request<PublicBooking>(`/public/bookings/${token}`),

  cancelBooking: (token: string) =>
    request<PublicBooking>(`/public/bookings/${token}/cancel`, { method: "PATCH" }),

  rescheduleBooking: (token: string, startAt: string, professionalId?: string) =>
    request<PublicBooking>(`/public/bookings/${token}/reschedule`, {
      method: "PATCH",
      body: JSON.stringify({ startAt, professionalId }),
    }),

  joinWaitlist: (slug: string, input: CreateWaitlistInput) =>
    request<unknown>(`/public/tenants/${slug}/waitlist`, {
      method: "POST",
      body: JSON.stringify(input),
    }),
};
