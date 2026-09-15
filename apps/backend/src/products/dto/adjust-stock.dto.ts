import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min, NotEquals } from "class-validator";

// Movimentos manuais de estoque. SALE é gerado só pelo fechamento de comanda, nunca aqui.
export class AdjustStockDto {
  @IsIn(["IN", "OUT", "ADJUSTMENT"])
  kind!: "IN" | "OUT" | "ADJUSTMENT";

  // Com sinal para ADJUSTMENT (+/-). Para IN/OUT o service normaliza o sinal.
  @IsInt()
  @NotEquals(0)
  @Min(-1_000_000)
  @Max(1_000_000)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
