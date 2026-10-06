// O desconto da comanda é um valor único (Ticket.discountCents), não por item. Para mostrar o
// faturamento líquido por profissional, ele é rateado proporcionalmente ao valor de cada item.
// Método do maior resto: a soma dos rateios é EXATAMENTE o desconto (nenhum centavo se perde nem
// aparece), e o resultado é determinístico (empate no resto vai pro item de menor índice).
// É regra de EXIBIÇÃO: não altera comissão nem a receita lançada no Financeiro.
export function allocateDiscount(itemGrossCents: number[], discountCents: number): number[] {
  const subtotal = itemGrossCents.reduce((sum, v) => sum + v, 0);
  const discount = Math.min(Math.max(0, Math.trunc(discountCents)), subtotal);
  if (discount === 0 || subtotal <= 0) return itemGrossCents.map(() => 0);

  const shares = itemGrossCents.map((gross) => (gross * discount) / subtotal);
  const floors = shares.map(Math.floor);
  let remainder = discount - floors.reduce((sum, v) => sum + v, 0);

  const order = shares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (const { index } of order) {
    if (remainder <= 0) break;
    floors[index] += 1;
    remainder -= 1;
  }
  return floors;
}
