import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { validationExceptionFactory } from "./pt-br-validation";
import { RegisterConsumerDto } from "../../consumer-auth/dto/consumer-dtos";
import { CreateServiceDto } from "../../services/dto/create-service.dto";

// Mesma configuração do main.ts.
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  exceptionFactory: validationExceptionFactory,
});

const messagesFor = async (metatype: new () => object, value: object): Promise<string[]> => {
  try {
    await pipe.transform(value, { type: "body", metatype });
    return [];
  } catch (error) {
    const response = (error as { getResponse: () => { message: string[]; statusCode: number } }).getResponse();
    expect(response.statusCode).toBe(400);
    return response.message;
  }
};

describe("mensagens de validação em português", () => {
  it("traduz o texto padrão do class-validator, com o rótulo do campo", async () => {
    const messages = await messagesFor(RegisterConsumerDto, { name: "A", phone: "11912345678", email: "x", password: "1", consent: true });
    expect(messages).toEqual(
      expect.arrayContaining([
        "Nome deve ter no mínimo 2 caracteres.",
        "E-mail inválido.",
        "Senha deve ter no mínimo 8 caracteres.",
      ]),
    );
  });

  it("mantém a mensagem que o próprio DTO já escreveu em português", async () => {
    const messages = await messagesFor(RegisterConsumerDto, { name: "Ana", phone: "123", email: "a@b.com", password: "12345678", consent: true });
    expect(messages).toEqual(["Telefone inválido. Informe DDD e número."]);
  });

  it("campo fora do DTO vira mensagem em português, sem eco do valor enviado", async () => {
    const messages = await messagesFor(CreateServiceDto, { name: "Corte", durationMinutes: 30, priceCents: 1000, tenantId: "outro-tenant" });
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatch(/não é permitido/);
    expect(messages[0]).not.toMatch(/outro-tenant/);
  });

  it("nenhuma mensagem sai em inglês", async () => {
    const messages = await messagesFor(CreateServiceDto, { name: 5, durationMinutes: "x", priceCents: -1 });
    expect(messages.length).toBeGreaterThan(0);
    for (const m of messages) expect(m).not.toMatch(/\b(must|should|be a|be an)\b/i);
  });
});
