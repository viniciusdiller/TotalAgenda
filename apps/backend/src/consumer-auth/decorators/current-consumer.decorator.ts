import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedConsumer } from "../types/consumer-auth-user";

export const CurrentConsumer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedConsumer => {
    const request = ctx.switchToHttp().getRequest();
    return request.consumerUser as AuthenticatedConsumer;
  },
);
