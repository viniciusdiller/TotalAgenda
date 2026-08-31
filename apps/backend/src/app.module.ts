import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { ServeStaticModule } from "@nestjs/serve-static";
import { validateEnv } from "./config/env.validation";
import { PrismaModule } from "./prisma/prisma.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { TenantBillingGuard } from "./common/guards/tenant-billing.guard";
import { UPLOADS_DIR, UPLOADS_URL_PREFIX } from "./common/constants/uploads";
import { AuthModule } from "./auth/auth.module";
import { TenantsModule } from "./tenants/tenants.module";
import { ProfessionalsModule } from "./professionals/professionals.module";
import { ServicesModule } from "./services/services.module";
import { AvailabilityModule } from "./availability/availability.module";
import { TimeBlocksModule } from "./time-blocks/time-blocks.module";
import { AppointmentsModule } from "./appointments/appointments.module";
import { WaitlistModule } from "./waitlist/waitlist.module";
import { BillingModule } from "./billing/billing.module";
import { WebhooksModule } from "./webhooks/webhooks.module";
import { ClientsModule } from "./clients/clients.module";
import { ClientAuthModule } from "./client-auth/client-auth.module";
import { IntakeModule } from "./intake/intake.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    ServeStaticModule.forRoot({ rootPath: UPLOADS_DIR, serveRoot: UPLOADS_URL_PREFIX }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    ProfessionalsModule,
    ServicesModule,
    AvailabilityModule,
    TimeBlocksModule,
    AppointmentsModule,
    WaitlistModule,
    BillingModule,
    WebhooksModule,
    ClientsModule,
    ClientAuthModule,
    IntakeModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: TenantBillingGuard },
  ],
})
export class AppModule {}
