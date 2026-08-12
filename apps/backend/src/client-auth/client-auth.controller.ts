import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ClientAuthService } from "./client-auth.service";
import { ClientLoginDto } from "./dto/client-login.dto";
import { Public } from "../common/decorators/public.decorator";
import { ClientJwtAuthGuard } from "./guards/client-jwt-auth.guard";
import { CurrentClient } from "./decorators/current-client.decorator";
import { AuthenticatedClient } from "./types/client-auth-user";

@Controller("public/tenants/:slug/client-auth")
export class ClientAuthController {
  constructor(private readonly clientAuthService: ClientAuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post("login")
  login(@Param("slug") slug: string, @Body() dto: ClientLoginDto) {
    return this.clientAuthService.login(slug, dto);
  }

  @Public()
  @UseGuards(ClientJwtAuthGuard)
  @Get("me")
  me(@CurrentClient() client: AuthenticatedClient) {
    return this.clientAuthService.me(client);
  }
}
