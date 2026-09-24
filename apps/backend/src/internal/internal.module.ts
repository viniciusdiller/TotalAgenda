import { Module } from "@nestjs/common";
import { InternalController } from "./internal.controller";
import { InternalService } from "./internal.service";
import { InternalAuthGuard } from "./internal-auth.guard";

@Module({
  controllers: [InternalController],
  providers: [InternalService, InternalAuthGuard],
})
export class InternalModule {}
