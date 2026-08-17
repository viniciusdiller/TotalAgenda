"use server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export interface SetPasswordState {
  error?: string;
  success?: boolean;
}

export async function setPasswordAction(
  _prevState: SetPasswordState | undefined,
  formData: FormData,
): Promise<SetPasswordState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (password.length < 8) {
    return { error: "A senha deve ter pelo menos 8 caracteres." };
  }
  if (password !== confirmPassword) {
    return { error: "As senhas não coincidem." };
  }

  try {
    const response = await fetch(`${API_URL}/auth/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const message = Array.isArray(body?.message)
        ? body.message.join(", ")
        : (body?.message ?? "Não foi possível definir a senha.");
      return { error: message };
    }

    return { success: true };
  } catch {
    return { error: "Erro inesperado ao comunicar com o servidor." };
  }
}
