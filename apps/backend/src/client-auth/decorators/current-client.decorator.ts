import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { AuthenticatedClient } from "../types/client-auth-user";

export const CurrentClient = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedClient => {
    const request = ctx.switchToHttp().getRequest();
    return request.clientUser as AuthenticatedClient;
  },
);
