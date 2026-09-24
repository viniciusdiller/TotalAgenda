import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from "@nestjs/common";
import type { Response } from "express";

// Mensagens PADRÃO do Nest/throttler saem em inglês ("Unauthorized", "ThrottlerException: Too Many Requests",
// "Cannot GET /x") e o frontend as mostra ao usuário. Traduz só esses textos padrão; qualquer mensagem que o
// código de domínio escreveu (já em português) passa intacta. Também evita o eco do caminho pedido
// ("Cannot GET /rota-interna") numa resposta de 404.
export function translateDefaultMessage(message: string): string | null {
  if (message === "Unauthorized") return "Sessão inválida ou expirada. Entre novamente.";
  if (message === "Forbidden resource" || message === "Forbidden") return "Você não tem permissão para fazer isso.";
  if (message === "ThrottlerException: Too Many Requests" || message === "Too Many Requests") {
    return "Muitas tentativas. Aguarde um instante e tente novamente.";
  }
  if (/^Cannot (GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS) /.test(message) || message === "Not Found") {
    return "Recurso não encontrado.";
  }
  if (message === "Bad Request") return "Requisição inválida.";
  if (message === "Payload Too Large") return "Conteúdo grande demais.";
  return null;
}

@Catch(HttpException)
export class PtBrHttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    if (typeof body === "object" && body !== null && typeof (body as { message?: unknown }).message === "string") {
      const translated = translateDefaultMessage((body as { message: string }).message);
      if (translated) {
        return response.status(status).json({ ...(body as object), message: translated });
      }
    } else if (typeof body === "string") {
      const translated = translateDefaultMessage(body);
      if (translated) return response.status(status).json({ statusCode: status, message: translated });
    }
    return response.status(status).json(body);
  }
}
