import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

export class CashMovementDto {
  // Só movimentos manuais aqui; SALE/OPENING são gerados pelo sistema.
  @IsIn(["WITHDRAWAL", "DEPOSIT"])
  kind!: "WITHDRAWAL" | "DEPOSIT";

  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class CloseCashRegisterDto {
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  closingCountedCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
