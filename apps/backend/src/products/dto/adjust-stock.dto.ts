import { IsIn, IsInt, IsOptional, IsString, NotEquals } from "class-validator";

// Movimentos manuais de estoque. SALE é gerado só pelo fechamento de comanda, nunca aqui.
export class AdjustStockDto {
  @IsIn(["IN", "OUT", "ADJUSTMENT"])
  kind!: "IN" | "OUT" | "ADJUSTMENT";

  // Com sinal para ADJUSTMENT (+/-). Para IN/OUT o service normaliza o sinal.
  @IsInt()
  @NotEquals(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
