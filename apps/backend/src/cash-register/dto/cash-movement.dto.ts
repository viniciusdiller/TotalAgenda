import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class CashMovementDto {
  // Só movimentos manuais aqui; SALE/OPENING são gerados pelo sistema.
  @IsIn(["WITHDRAWAL", "DEPOSIT"])
  kind!: "WITHDRAWAL" | "DEPOSIT";

  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CloseCashRegisterDto {
  @IsInt()
  @Min(0)
  closingCountedCents!: number;

  @IsOptional()
  @IsString()
  note?: string;
}
