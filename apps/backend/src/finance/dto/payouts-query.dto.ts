import { IsOptional, IsUUID } from "class-validator";
import { PaginationQueryDto } from "../../common/pagination/pagination-query.dto";

// Em arquivo próprio: PaginationQueryDto usa class-transformer (@Type) e exige reflect-metadata
// carregado, o que não deve ser pré-requisito de quem só importa os DTOs de corpo do financeiro.
export class PayoutsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  professionalId?: string;
}
