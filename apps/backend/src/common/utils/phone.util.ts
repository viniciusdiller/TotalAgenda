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

export function isPlausibleBrazilianPhone(normalized: string): boolean {
  return normalized.length === 10 || normalized.length === 11; // DDD + 8 ou 9 dígitos
}
