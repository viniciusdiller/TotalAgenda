import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { NestExpressApplication } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import { AppModule } from "./app.module";
import { PrismaExceptionFilter } from "./common/filters/prisma-exception.filter";

async function bootstrap() {
  // rawBody: true preserva o corpo bruto da requisição (necessário para validar a
  // assinatura do webhook do Stripe em billing/webhook, que roda antes do parser JSON).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // O wizard público de agendamento (apps/frontend) chama os endpoints /public/* direto do
  // browser, já que não carregam dados sensíveis por trás de autenticação.
  const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3000";
  app.enableCors({ origin: frontendUrl, credentials: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());

  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
}

bootstrap();
