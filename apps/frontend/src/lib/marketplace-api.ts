import type {
  ConsumerSession,
  MarketplaceCategory,
  MarketplaceEstablishment,
  MarketplaceResult,
  ReviewablePastAppointment,
} from "@totalagenda/shared-types";
import { ApiError } from "./api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(body?.message)
      ? body.message.join(", ")
      : (body?.message ?? "Erro inesperado.");
    throw new ApiError(message, res.status);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const marketplaceApi = {
  categories: () => req<MarketplaceCategory[]>("/public/marketplace/categories"),
  cities: () => req<string[]>("/public/marketplace/cities"),
  search: (params: Record<string, string | undefined>) => {
    const qs = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v) as [string, string][],
    );
    return req<MarketplaceResult[]>(`/public/marketplace/search?${qs.toString()}`);
  },
  establishment: (slug: string) =>
    req<MarketplaceEstablishment>(`/public/marketplace/establishments/${slug}`),
};

// ── Consumidor (login próprio, token em localStorage) ──

const TOKEN_KEY = "ta_consumer_token";

export function getConsumerToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setConsumerToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

function authed<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getConsumerToken();
  return req<T>(path, {
    ...init,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init?.headers },
  });
}

export const consumerApi = {
  register: (body: { name: string; phone: string; email?: string; consent: boolean }) =>
    req<ConsumerSession>("/public/consumer/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  login: (phone: string) =>
    req<ConsumerSession>("/public/consumer/login", {
      method: "POST",
      body: JSON.stringify({ phone }),
    }),
  me: () =>
    authed<{
      id: string;
      name: string;
      phone: string;
      establishments: Array<{ name: string; slug: string; logoUrl: string | null }>;
    }>("/public/consumer/me"),
  pendingReviews: () =>
    authed<ReviewablePastAppointment[]>("/public/consumer/reviews/pending"),
  submitReview: (body: { appointmentId: string; rating: number; comment?: string }) =>
    authed("/public/consumer/reviews", { method: "POST", body: JSON.stringify(body) }),
  link: (slug: string) =>
    authed(`/public/consumer/link/${slug}`, { method: "POST" }),
};
