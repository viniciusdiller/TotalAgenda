import { IsString, MinLength, IsUUID } from "class-validator";

// Sem isso, serviceId chegava como `@Query("serviceId") serviceId: string` sem validação —
// se omitido, Prisma trata `serviceId: undefined` como "sem filtro" e devolve profissionais
// de QUALQUER serviço do tenant, não um erro 400 (o oposto do que a rota promete: "por
// serviço").
export class FindPublicProfessionalsQueryDto {
  @IsUUID()
  serviceId!: string;
}
