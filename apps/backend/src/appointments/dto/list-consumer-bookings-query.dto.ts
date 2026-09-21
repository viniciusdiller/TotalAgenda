import { IsIn, IsOptional, IsString, Matches, MaxLength } from "class-validator";
import { PaginationQueryDto } from "../../common/pagination/pagination-query.dto";

export const CONSUMER_BOOKING_SCOPES = ["upcoming", "past"] as const;
export type ConsumerBookingScope = (typeof CONSUMER_BOOKING_SCOPES)[number];

export class ListConsumerBookingsQueryDto extends PaginationQueryDto {
  // upcoming = confirmados a partir de agora (mais próximo primeiro); past = todo o resto
  // (mais recente primeiro). Sem scope, devolve tudo do mais recente pro mais antigo.
  @IsOptional()
  @IsIn(CONSUMER_BOOKING_SCOPES)
  scope?: ConsumerBookingScope;

  // Restringe a um salão (ex.: o contador de "Compromissos" da página de cada salão).
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z0-9-]+$/)
  tenantSlug?: string;
}
