import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateIf,
} from "class-validator";

export class OpenTicketDto {
  // Abre a partir de um atendimento (copia os serviços) OU avulsa com cliente opcional.
  @IsOptional()
  @IsString()
  appointmentId?: string;

  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class AddTicketItemDto {
  @IsIn(["SERVICE", "PRODUCT", "CUSTOM"])
  kind!: "SERVICE" | "PRODUCT" | "CUSTOM";

  @ValidateIf((o) => o.kind === "SERVICE")
  @IsString()
  serviceId?: string;

  @ValidateIf((o) => o.kind === "PRODUCT")
  @IsString()
  productId?: string;

  @ValidateIf((o) => o.kind === "CUSTOM")
  @IsString()
  @MinLength(2)
  description?: string;

  // Obrigatório para CUSTOM; override opcional para SERVICE/PRODUCT (senão usa o catálogo).
  @ValidateIf((o) => o.kind === "CUSTOM")
  @IsInt()
  @Min(0)
  unitPriceCents?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  professionalId?: string;
}

export class SetTicketDiscountDto {
  @IsInt()
  @Min(0)
  discountCents!: number;
}

export class AddPaymentDto {
  @IsIn(["CASH", "DEBIT", "CREDIT", "PIX", "OTHER"])
  method!: "CASH" | "DEBIT" | "CREDIT" | "PIX" | "OTHER";

  @IsInt()
  @Min(1)
  amountCents!: number;
}
