import { Module } from "@nestjs/common";
import { WaitlistService } from "./waitlist.service";
import { WaitlistController, PublicWaitlistController } from "./waitlist.controller";
import { ConsumerAuthModule } from "../consumer-auth/consumer-auth.module";

@Module({
  imports: [ConsumerAuthModule],
  controllers: [WaitlistController, PublicWaitlistController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
