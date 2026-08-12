import { Module } from "@nestjs/common";
import { WaitlistService } from "./waitlist.service";
import { WaitlistController, PublicWaitlistController } from "./waitlist.controller";
import { ClientsModule } from "../clients/clients.module";

@Module({
  imports: [ClientsModule],
  controllers: [WaitlistController, PublicWaitlistController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
