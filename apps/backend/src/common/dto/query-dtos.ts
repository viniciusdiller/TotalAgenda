import { IsISO8601, IsOptional, IsString, MaxLength } from "class-validator";

// @Query("campo") solto não passa pelo ValidationPipe: `?professionalId[a]=b` ou
// `?search=a&search=b` chegam como objeto/array, vão cru pro Prisma/`.trim()` e viram 500 em
// vez de 400. Estes DTOs fecham essa fronteira (mesmo padrão de PaginationQueryDto).

export class ClientSearchQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class DateRangeQueryDto {
  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class RequiredDateRangeQueryDto {
  @IsISO8601()
  from!: string;

  @IsISO8601()
  to!: string;
}

// professionalId é só FILTRO adicional: quem é PROFESSIONAL tem o valor sobrescrito pelo do JWT
// no controller/service, nunca é fonte de autorização.
export class RangeByProfessionalQueryDto extends RequiredDateRangeQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  professionalId?: string;
}

export class TimeBlocksQueryDto {
  @IsString()
  @MaxLength(64)
  professionalId!: string;
}
