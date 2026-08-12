"use server";

import { redirect } from "next/navigation";
import { publicApi, ApiError } from "@/lib/api";
import { setClientToken } from "@/lib/client-session";

export interface ClientLoginState {
  error?: string;
  notFound?: boolean;
}

export async function clientLoginAction(
  slug: string,
  _prevState: ClientLoginState | undefined,
  formData: FormData,
): Promise<ClientLoginState> {
  const phone = String(formData.get("phone") ?? "");

  try {
    const result = await publicApi.clientLogin(slug, phone);
    await setClientToken(slug, result.accessToken);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode === 404) {
      return { notFound: true };
    }
    return { error: error instanceof ApiError ? error.message : "Não foi possível entrar." };
  }

  redirect(`/${slug}/conta`);
}
