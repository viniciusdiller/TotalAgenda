import { Body, Controller, Delete, Get, NotFoundException, Param, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ConsumerAuthService } from "./consumer-auth.service";
import { ConsumerLoginDto, RegisterConsumerDto } from "./dto/consumer-dtos";
import { ConsumerJwtAuthGuard } from "./guards/consumer-jwt-auth.guard";
import { CurrentConsumer } from "./decorators/current-consumer.decorator";
import { AuthenticatedConsumer } from "./types/consumer-auth-user";
import { Public } from "../common/decorators/public.decorator";

@Controller("public/consumer")
export class ConsumerAuthController {
  constructor(private readonly consumerAuth: ConsumerAuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("register")
  register(@Body() dto: RegisterConsumerDto) {
    return this.consumerAuth.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post("login")
  login(@Body() dto: ConsumerLoginDto) {
    return this.consumerAuth.login(dto);
  }

  @Public()
  @UseGuards(ConsumerJwtAuthGuard)
  @Get("me")
  me(@CurrentConsumer() consumer: AuthenticatedConsumer) {
    return this.consumerAuth.me(consumer);
  }

  @Public()
  @UseGuards(ConsumerJwtAuthGuard)
  @Delete("me")
  deleteAccount(@CurrentConsumer() consumer: AuthenticatedConsumer) {
    return this.consumerAuth.deleteAccount(consumer);
  }

  // Vincula o consumidor logado a um estabelecimento (cria/associa o Client daquele
  // tenant). Chamado pelo portal após um agendamento pelo marketplace.
  @Public()
  @UseGuards(ConsumerJwtAuthGuard)
  @Post("link/:slug")
  async link(
    @CurrentConsumer() consumer: AuthenticatedConsumer,
    @Param("slug") slug: string,
  ) {
    const tenant = await this.consumerAuth.tenantIdBySlug(slug);
    if (!tenant) throw new NotFoundException("Estabelecimento não encontrado.");
    await this.consumerAuth.ensureLink(consumer.consumerId, tenant);
    return { linked: true };
  }
}
