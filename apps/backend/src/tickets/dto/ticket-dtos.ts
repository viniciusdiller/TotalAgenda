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

  // Obrigatório para CUSTOM; override opcional para SERVICE/PRODUCT (senão usa o catálogo do
  // momento). @ValidateIf tinha só o caso CUSTOM — pra SERVICE/PRODUCT o campo passava direto
  // sem NENHUMA validação (nem tipo, nem sinal), porque os decorators abaixo são pulados
  // quando ValidateIf retorna false. Agora valida sempre que o campo vier preenchido, não só
  // no caso CUSTOM — fecha a porta pra um preço negativo/absurdo entrar via override.
  @ValidateIf((o) => o.kind === "CUSTOM" || o.unitPriceCents !== undefined)
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
