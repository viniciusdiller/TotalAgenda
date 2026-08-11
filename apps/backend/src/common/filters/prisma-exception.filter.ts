import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@totalagenda/database";
import { Response } from "express";

// SQLSTATE 23P01 = exclusion_violation (nossa constraint EXCLUDE anti double-booking).
// Não é mapeado pelo Prisma (que só conhece unique_violation, 23505 → P2002), então chega
// como PrismaClientUnknownRequestError e precisamos inspecionar a mensagem manualmente.
const EXCLUSION_VIOLATION_SQLSTATE = "23P01";

@Catch(Prisma.PrismaClientKnownRequestError, Prisma.PrismaClientUnknownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError | Prisma.PrismaClientUnknownRequestError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        return this.send(response, new ConflictException("Registro duplicado."));
      }
      if (exception.code === "P2025") {
        return this.send(response, new NotFoundException("Registro não encontrado."));
      }
    }

    if (exception.message.includes(EXCLUSION_VIOLATION_SQLSTATE)) {
      return this.send(
        response,
        new ConflictException("Este horário acabou de ser reservado por outro cliente."),
      );
    }

    return this.send(
      response,
      new ConflictException("Não foi possível completar a operação."),
    );
  }

  private send(response: Response, exception: ConflictException | NotFoundException) {
    const status = exception.getStatus();
    response.status(status).json(exception.getResponse());
  }
}
