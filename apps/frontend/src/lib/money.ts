// Formata centavos como moeda BRL pra exibição ("R$ 45,90"). Diferente de `formatCentsBRL`
// em `masks.ts`, que devolve só o número ("45,90") pra dentro de um campo editável.
export function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
