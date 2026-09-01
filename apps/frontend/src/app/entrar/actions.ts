"use server";

import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

export async function loginAction(
  _prevState: LoginState | undefined,
  formData: FormData,
): Promise<LoginState> {
  try {
    // redirect: false em vez de redirectTo: o signIn() do next-auth v5 constrói a URL de
    // redirect internamente (createActionURL) e essa construção trava a navegação no
    // Next.js 16 (nextauthjs/next-auth#13388, ainda aberto) — a sessão é criada certinho,
    // mas o browser nunca navega de verdade e a tela fica "carregando" pra sempre.
    // Fazendo o redirect nós mesmos com next/navigation, contornamos essa lógica interna.
    const result = await signIn("credentials", {
      email: formData.get("email"),
      password: formData.get("password"),
      redirect: false,
    });

    if (result?.error) {
      return { error: "E-mail ou senha incorretos." };
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "E-mail ou senha incorretos." };
    }
    throw error;
  }

  redirect("/dashboard");
}
