import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export const MAX_PAGE_SIZE = 50;
export const DEFAULT_PAGE_SIZE = 10;

// Base pra qualquer @Query() de listagem paginada (estender e acrescentar filtros). O teto de
// pageSize é o que impede "?pageSize=1000000" de virar leitura sem limite — validação de
// boundary, não só um default. @Type porque o ValidationPipe global transforma sem conversão
// implícita: sem isso page/pageSize chegariam como string e falhariam no @IsInt.
export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}
