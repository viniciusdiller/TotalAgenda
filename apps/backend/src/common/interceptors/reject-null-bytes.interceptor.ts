import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";

// O Postgres não guarda o byte NUL (\u0000) em texto: o INSERT falha no meio da operação com um erro
// de driver. É entrada de teste de fuzzing, nunca de usuário — melhor recusar na borda com 400 do que
// deixar o erro do banco subir. Percorre corpo e query (objetos/arrays aninhados, com teto de
// profundidade para não virar vetor de DoS por recursão).
const MAX_DEPTH = 8;

export function containsNullByte(value: unknown, depth = 0): boolean {
  if (typeof value === "string") return value.includes("\u0000");
  if (depth >= MAX_DEPTH || value === null || typeof value !== "object") return false;
  const entries = Array.isArray(value) ? value : Object.entries(value).flat();
  return entries.some((v) => containsNullByte(v, depth + 1));
}

@Injectable()
export class RejectNullBytesInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === "http") {
      const req = context.switchToHttp().getRequest<{ body?: unknown; query?: unknown }>();
      if (containsNullByte(req.body) || containsNullByte(req.query)) {
        throw new BadRequestException("Caracteres inválidos na requisição.");
      }
    }
    return next.handle();
  }
}
