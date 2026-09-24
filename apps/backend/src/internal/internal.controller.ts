import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Post, Query, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { Public } from "../common/decorators/public.decorator";
import { InternalAuthGuard } from "./internal-auth.guard";
import { InternalService } from "./internal.service";
import { InternalTenantsQueryDto, PasswordResetLinkDto } from "./dto/internal.dto";

// API de SUPORTE, chamada só pelo Admin-TotalSoftware. Não usa JWT de usuário (@Public pula os guards
// de staff): a autenticação é a assinatura HMAC da requisição (InternalAuthGuard). Enxerga TODOS os
// tenants por desenho, então nunca deve ficar exposta ao público: no proxy, restrinja /internal/ ao IP do
// Admin (defesa em profundidade; o HMAC continua sendo a autenticação).
const INTERNAL_THROTTLE = { default: { limit: 30, ttl: 60_000 } };

@Public()
@UseGuards(InternalAuthGuard)
@Throttle(INTERNAL_THROTTLE)
@Controller("internal")
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Get("tenants")
  listTenants(@Query() query: InternalTenantsQueryDto) {
    return this.internalService.listTenants(query);
  }

  @HttpCode(200)
  @Post("tenants/:id/password-reset-link")
  createPasswordResetLink(
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() dto: PasswordResetLinkDto,
  ) {
    return this.internalService.createPasswordResetLink(id, dto.actor);
  }
}
