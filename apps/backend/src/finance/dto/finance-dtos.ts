import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from "class-validator";

export class CreateCategoryDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsIn(["INCOME", "EXPENSE"])
  direction!: "INCOME" | "EXPENSE";

  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  isArchived?: boolean;
}

export class CreateEntryDto {
  @IsIn(["INCOME", "EXPENSE"])
  direction!: "INCOME" | "EXPENSE";

  @IsString()
  @MinLength(2)
  description!: string;

  @IsInt()
  @Min(1)
  amountCents!: number;

  // Data de vencimento (YYYY-MM-DD).
  @IsISO8601()
  dueDate!: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  counterparty?: string;

  @IsOptional()
  @IsString()
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
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  amountCents?: number;

  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @IsOptional()
  @IsString()
  categoryId?: string | null;

  @IsOptional()
  @IsString()
  counterparty?: string | null;

  @IsOptional()
  @IsString()
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

export class CloseCommissionsDto {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;

  // Vencimento do(s) lançamento(s) de comissão gerado(s).
  @IsISO8601()
  dueDate!: string;
}
