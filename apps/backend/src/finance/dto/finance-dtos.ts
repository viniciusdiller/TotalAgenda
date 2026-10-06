import { Trim } from "../../common/decorators/trim.decorator";
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsUUID,
} from "class-validator";

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Trim()
  name!: string;

  @IsIn(["INCOME", "EXPENSE"])
  direction!: "INCOME" | "EXPENSE";

  @IsOptional()
  @IsUUID()
  parentId?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @Trim()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;
}

export class CreateEntryDto {
  @IsIn(["INCOME", "EXPENSE"])
  direction!: "INCOME" | "EXPENSE";

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Trim()
  description!: string;

  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountCents!: number;

  // Data de vencimento (YYYY-MM-DD).
  @IsISO8601()
  dueDate!: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Trim()
  counterparty?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Trim()
  notes?: string;

  // Se informado, o lançamento já nasce quitado nesta data.
  @IsOptional()
  @IsISO8601()
  paidAt?: string;

  @IsOptional()
  @IsIn(["CASH", "DEBIT", "CREDIT", "PIX", "OTHER"])
  paymentMethod?: "CASH" | "DEBIT" | "CREDIT" | "PIX" | "OTHER";
}

export class UpdateEntryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  @Trim()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountCents?: number;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Trim()
  counterparty?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  @Trim()
  notes?: string | null;
}

export class SettleEntryDto {
  // Data da baixa (default: hoje).
  @IsOptional()
  @IsISO8601()
  paidAt?: string;

  @IsOptional()
  @IsIn(["CASH", "DEBIT", "CREDIT", "PIX", "OTHER"])
  paymentMethod?: "CASH" | "DEBIT" | "CREDIT" | "PIX" | "OTHER";
}

// Repasse pago a um profissional. Só o NOVO pagamento vem do cliente: o servidor recalcula o saldo
// a repassar dentro da transação e recusa valor acima dele (o DTO só valida tipo/faixa).
export class RegisterPayoutDto {
  @IsUUID()
  professionalId!: string;

  @IsInt()
  @Min(1)
  @Max(100_000_000)
  amountCents!: number;

  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(200)
  note?: string;
}
