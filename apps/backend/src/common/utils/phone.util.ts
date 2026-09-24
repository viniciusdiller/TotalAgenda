// Remove tudo que não é dígito e, se presente, o DDI 55 — assim "(11) 91234-5678",
// "11 91234-5678" e "5511912345678" normalizam pro mesmo valor e batem no mesmo Client.
// Usado tanto no upsert de Client (a cada agendamento público) quanto no login por telefone.
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length > 11 && digits.startsWith("55")) {
    return digits.slice(2);
  }
  return digits;
}

// Telefone nacional plausível: DDD (11–99, sem zero à esquerda) + 8 dígitos (fixo) ou 9 (celular,
// que sempre começa com 9). Não prova que a linha existe — só barra lixo ("1111111111", "0000...",
// DDD inexistente) que hoje viraria um Client/Consumer com telefone impossível de contatar.
export function isPlausibleBrazilianPhone(normalized: string): boolean {
  if (!/^\d+$/.test(normalized)) return false;
  if (normalized.length !== 10 && normalized.length !== 11) return false;
  if (!/^[1-9][1-9]/.test(normalized)) return false; // DDD: 11–99, nenhum dígito zero
  if (normalized.length === 11 && normalized[2] !== "9") return false; // celular começa com 9
  if (normalized.length === 10 && normalized[2] === "0") return false;
  // Repetição total (1199999999 etc.) é digitação de teste, não número real.
  return !/^(\d)\1+$/.test(normalized.slice(2));
}

// WhatsApp do tenant (link wa.me): sempre com DDI. Aceita o que o dono digitou com ou sem 55.
export function toWhatsappDigits(raw: string): string {
  const national = normalizePhone(raw);
  return isPlausibleBrazilianPhone(national) ? `55${national}` : "";
}
