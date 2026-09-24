import { Transform } from "class-transformer";
import { IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { PaginationQueryDto } from "../../common/pagination/pagination-query.dto";

export class InternalTenantsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === "string" ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class PasswordResetLinkDto {
  // Quem no suporte pediu (e-mail do admin, vindo assinado do Admin). Só vai para a trilha de auditoria.
  @IsString()
  @IsNotEmpty()
  @MaxLength(254)
  actor!: string;
}
