import { Module } from "@nestjs/common";
import { ReviewsService } from "./reviews.service";
import { ConsumerReviewsController, OwnerReviewsController } from "./reviews.controller";
import { ConsumerAuthModule } from "../consumer-auth/consumer-auth.module";

@Module({
  imports: [ConsumerAuthModule],
  controllers: [ConsumerReviewsController, OwnerReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
