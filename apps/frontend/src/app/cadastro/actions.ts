"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface RegisterState {
  error?: string;
}

export async function registerAction(
  _prevState: RegisterState | undefined,
  formData: FormData,
): Promise<RegisterState> {
  const businessName = formData.get("businessName");
  const ownerName = formData.get("ownerName");
  const email = formData.get("email");
  const password = formData.get("password");

  const response = await fetch(`${API_URL}/auth/register-owner`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessName, ownerName, email, password }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message.join(", ") : body?.message;
    return { error: message ?? "Não foi possível criar a conta." };
  }

  try {
    await signIn("credentials", { email, password, redirectTo: "/dashboard" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Conta criada, mas não foi possível entrar automaticamente. Faça login." };
    }
    throw error;
  }
}
