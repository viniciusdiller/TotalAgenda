import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";

// Duas entradas que só existem em fuzzing/ataque, nunca num formulário, e que hoje falham no MEIO da
// operação em vez de na borda:
//   1. Byte NUL (\u0000) em texto: o Postgres não o guarda e o INSERT falha com erro de driver.
//   2. Chave "__proto__", "constructor" ou "prototype" em qualquer objeto do corpo/query: o class-transformer
//      0.5.1 quebra com TypeError ("reading 'constructor'") → 500 para quem mandar `{"answers":{"constructor":1}}`,
//      e `__proto__` é o vetor clássico de poluição de protótipo em qualquer merge posterior.
// Recusar com 400 aqui (interceptor roda antes dos pipes) é mais barato e mais claro. Percorre corpo e query
// com teto de profundidade para a própria checagem não virar vetor de DoS por recursão.
const MAX_DEPTH = 8;
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function containsUnsafeInput(value: unknown, depth = 0): boolean {
  if (typeof value === "string") return value.includes("\u0000");
  if (depth >= MAX_DEPTH || value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((v) => containsUnsafeInput(v, depth + 1));
  return Object.entries(value).some(
    ([key, v]) => FORBIDDEN_KEYS.has(key) || key.includes("\u0000") || containsUnsafeInput(v, depth + 1),
  );
}

@Injectable()
export class RejectUnsafeInputInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === "http") {
      const req = context.switchToHttp().getRequest<{ body?: unknown; query?: unknown }>();
      if (containsUnsafeInput(req.body) || containsUnsafeInput(req.query)) {
        throw new BadRequestException("Caracteres inválidos na requisição.");
      }
    }
    return next.handle();
  }
}
