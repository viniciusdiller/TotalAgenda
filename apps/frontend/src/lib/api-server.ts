import "server-only";
import { auth } from "@/lib/auth";
import { ApiError } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export async function authedFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new ApiError("Não autenticado.", 401);
  }

  // Upload de arquivo (FormData) não pode ter Content-Type forçado pra application/json —
  // o browser precisa setar multipart/form-data; boundary=... sozinho.
  const isFormData = init?.body instanceof FormData;

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      Authorization: `Bearer ${session.accessToken}`,
      ...init?.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : (body?.message ?? "Erro inesperado ao comunicar com o servidor.");
    throw new ApiError(message, response.status);
  }

  return response.json() as Promise<T>;
}
