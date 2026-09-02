import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateClientDto } from "./create-client.dto";
import { UpdateClientDto } from "./update-client.dto";

async function errorsFor<T extends object>(cls: new () => T, plain: Record<string, unknown>) {
  const dto = plainToInstance(cls, plain);
  return validate(dto as object);
}

describe("CreateClientDto — email", () => {
  const base = { name: "Ana Cliente", phone: "11988887777" };

  it("rejeita e-mail com formato inválido", async () => {
    const errors = await errorsFor(CreateClientDto, { ...base, email: "não-é-email" });
    expect(errors.some((e) => e.property === "email")).toBe(true);
  });

  it("aceita e-mail válido", async () => {
    const errors = await errorsFor(CreateClientDto, { ...base, email: "ana@example.com" });
    expect(errors.some((e) => e.property === "email")).toBe(false);
  });

  it("aceita omitir o e-mail", async () => {
    const errors = await errorsFor(CreateClientDto, base);
    expect(errors.some((e) => e.property === "email")).toBe(false);
  });
});

describe("UpdateClientDto — email (PATCH parcial, \"\"/null limpam o campo)", () => {
  it("rejeita e-mail com formato inválido", async () => {
    const errors = await errorsFor(UpdateClientDto, { email: "não-é-email" });
    expect(errors.some((e) => e.property === "email")).toBe(true);
  });

  it("aceita string vazia (limpar o campo)", async () => {
    const errors = await errorsFor(UpdateClientDto, { email: "" });
    expect(errors.some((e) => e.property === "email")).toBe(false);
  });

  it("aceita null (limpar o campo)", async () => {
    const errors = await errorsFor(UpdateClientDto, { email: null });
    expect(errors.some((e) => e.property === "email")).toBe(false);
  });

  it("aceita e-mail válido", async () => {
    const errors = await errorsFor(UpdateClientDto, { email: "ana@example.com" });
    expect(errors.some((e) => e.property === "email")).toBe(false);
  });
});
