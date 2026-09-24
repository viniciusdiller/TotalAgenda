import { ForbiddenException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PtBrHttpExceptionFilter, translateDefaultMessage } from "./pt-br-http-exception.filter";

function run(exception: Error & { getStatus?: () => number; getResponse?: () => unknown }) {
  let sent: { status: number; body: unknown } | undefined;
  const response = {
    status: (status: number) => ({
      json: (body: unknown) => {
        sent = { status, body };
      },
    }),
  };
  const host = { switchToHttp: () => ({ getResponse: () => response }) };
  new PtBrHttpExceptionFilter().catch(exception as never, host as never);
  return sent!;
}

describe("translateDefaultMessage", () => {
  it("traduz só os textos padrão do Nest/throttler", () => {
    expect(translateDefaultMessage("Unauthorized")).toMatch(/Entre novamente/);
    expect(translateDefaultMessage("Forbidden resource")).toMatch(/permissão/);
    expect(translateDefaultMessage("ThrottlerException: Too Many Requests")).toMatch(/Muitas tentativas/);
    expect(translateDefaultMessage("Cannot GET /qualquer/rota")).toBe("Recurso não encontrado.");
  });

  it("deixa passar mensagem de domínio (já em português)", () => {
    expect(translateDefaultMessage("Cliente não encontrado.")).toBeNull();
    expect(translateDefaultMessage("Já existe um cliente com este telefone.")).toBeNull();
  });
});

describe("PtBrHttpExceptionFilter", () => {
  it("mantém o status e troca só o texto", () => {
    expect(run(new UnauthorizedException())).toEqual({
      status: 401,
      body: expect.objectContaining({ statusCode: 401, message: "Sessão inválida ou expirada. Entre novamente." }),
    });
    expect(run(new ForbiddenException()).status).toBe(403);
  });

  it("não devolve o caminho pedido em 404 de rota inexistente", () => {
    const sent = run(new NotFoundException("Cannot GET /internal/segredo"));
    expect(JSON.stringify(sent.body)).not.toContain("/internal/segredo");
    expect(sent.status).toBe(404);
  });

  it("preserva mensagem de domínio e lista de erros de validação", () => {
    expect(run(new NotFoundException("Cliente não encontrado.")).body).toEqual(
      expect.objectContaining({ message: "Cliente não encontrado." }),
    );
    const list = new (class extends ForbiddenException {})(["a", "b"]);
    expect((run(list).body as { message: unknown }).message).toEqual(["a", "b"]);
  });
});
