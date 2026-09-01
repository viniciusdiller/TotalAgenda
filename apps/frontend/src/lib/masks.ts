// Máscaras de exibição (BR). Formatam só o que é mostrado ao usuário — o valor "cru"
// (dígitos, ou centavos no caso de dinheiro) é sempre o que viaja pro backend/Server Action,
// nunca o texto formatado. Sem lib externa: são poucas regras, não justifica dependência.

export function formatPhoneBR(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  // Celular (9 dígitos): (11) 91234-5678 · Fixo (8 dígitos): (11) 1234-5678
  const splitAt = d.length > 10 ? 7 : 6;
  return `(${d.slice(0, 2)}) ${d.slice(2, splitAt)}-${d.slice(splitAt)}`;
}

export function formatCPF(digits: string): string {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  const parts = [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean);
  const dv = d.slice(9, 11);
  return parts.join(".") + (dv ? `-${dv}` : "");
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// Formata um valor em centavos (Int, mesma convenção do backend — ver CLAUDE.md "Dinheiro
// sempre em centavos") como string BRL, sem símbolo (o símbolo fica no prefixo visual do
// campo).
export function formatCentsBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Inverso de formatCentsBRL: entrada digitada livre (ex.: "45,9", "1.234,56", "4590") vira
// centavos inteiros. Trata o input como "dígitos = centavos" quando não há separador
// decimal explícito, e como reais quando há vírgula/ponto — cobre tanto "digitar 4590" (raro)
// quanto o caso comum "digitar 45,90".
export function parseBRLToCents(value: string): number {
  const cleaned = value.replace(/[^\d,.-]/g, "");
  if (!cleaned) return 0;
  const normalized = cleaned.includes(",")
    ? cleaned.replace(/\./g, "").replace(",", ".")
    : cleaned;
  const reais = Number.parseFloat(normalized);
  return Number.isFinite(reais) ? Math.round(reais * 100) : 0;
}
