import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ConsumerAuthController } from "./consumer-auth.controller";
import { ConsumerAuthService } from "./consumer-auth.service";
import { ConsumerJwtAuthGuard } from "./guards/consumer-jwt-auth.guard";

@Module({
  imports: [AuthModule],
  controllers: [ConsumerAuthController],
  providers: [ConsumerAuthService, ConsumerJwtAuthGuard],
  // Reexporta AuthModule pelo mesmo motivo do ClientAuthModule (JwtService visível onde o
  // guard é usado via @UseGuards em outro módulo — ex.: ReviewsModule).
  exports: [AuthModule, ConsumerAuthService, ConsumerJwtAuthGuard],
})
export class ConsumerAuthModule {}
