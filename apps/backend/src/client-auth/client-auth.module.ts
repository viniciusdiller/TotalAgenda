import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { ClientsModule } from "../clients/clients.module";
import { ClientAuthController } from "./client-auth.controller";
import { ClientAuthService } from "./client-auth.service";
import { ClientJwtAuthGuard } from "./guards/client-jwt-auth.guard";

@Module({
  imports: [AuthModule, ClientsModule],
  controllers: [ClientAuthController],
  providers: [ClientAuthService, ClientJwtAuthGuard],
  // Reexporta AuthModule (não só AuthService/ClientJwtAuthGuard): quando ClientJwtAuthGuard
  // é usado via @UseGuards() em outro módulo (ex: BookingsModule), o Nest instancia o guard
  // no contexto de injeção daquele módulo consumidor — então JwtService (dependência do
  // guard, vindo do JwtModule que AuthModule importa/exporta) precisa estar visível ali
  // também, não só aqui dentro do ClientAuthModule.
  exports: [AuthModule, ClientAuthService, ClientJwtAuthGuard],
})
export class ClientAuthModule {}
