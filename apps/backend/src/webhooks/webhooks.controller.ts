import { Body, Controller, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { WebhooksService } from "./webhooks.service";
import { TotalSoftwareWebhookDto } from "./dto/totalsoftware-webhook.dto";
import { Public } from "../common/decorators/public.decorator";
import { WebhookSecretGuard } from "../common/guards/webhook-secret.guard";

// Recebe os dois eventos do Admin-TotalSoftware (provisionamento de tenant e sincronização
// de status de assinatura) na mesma URL, diferenciados pelo campo `evento`. Protegido por
// segredo compartilhado (WebhookSecretGuard), não por JWT de usuário — é uma chamada
// servidor-a-servidor. O envio de lá é fail-open: erros aqui só são logados do lado deles,
// então sempre respondemos 2xx em sucesso e 4xx/5xx com { message } em erro.
@Public()
@UseGuards(WebhookSecretGuard)
@Controller("webhooks/totalsoftware")
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  handle(@Body() dto: TotalSoftwareWebhookDto) {
    if (dto.evento === "provisionamento") {
      return this.webhooksService.provisionar(dto);
    }
    return this.webhooksService.sincronizarStatus(dto);
  }
}
