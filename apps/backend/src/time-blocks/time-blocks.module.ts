import { Module } from "@nestjs/common";
import { TimeBlocksService } from "./time-blocks.service";
import { TimeBlocksController } from "./time-blocks.controller";

@Module({
  controllers: [TimeBlocksController],
  providers: [TimeBlocksService],
  exports: [TimeBlocksService],
})
export class TimeBlocksModule {}
