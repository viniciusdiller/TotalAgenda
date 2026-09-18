import { Body, Controller, Delete, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ConsumerAuthService } from "./consumer-auth.service";
import {
  ChangeConsumerPasswordDto,
  ConsumerLoginDto,
  RegisterConsumerDto,
  UpdateConsumerProfileDto,
} from "./dto/consumer-dtos";
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
  @Patch("me")
  updateProfile(@CurrentConsumer() consumer: AuthenticatedConsumer, @Body() dto: UpdateConsumerProfileDto) {
    return this.consumerAuth.updateProfile(consumer, dto);
  }

  @Public()
  @UseGuards(ConsumerJwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Patch("password")
  changePassword(@CurrentConsumer() consumer: AuthenticatedConsumer, @Body() dto: ChangeConsumerPasswordDto) {
    return this.consumerAuth.changePassword(consumer, dto);
  }

  @Public()
  @UseGuards(ConsumerJwtAuthGuard)
  @Delete("me")
  deleteAccount(@CurrentConsumer() consumer: AuthenticatedConsumer) {
    return this.consumerAuth.deleteAccount(consumer);
  }
}
