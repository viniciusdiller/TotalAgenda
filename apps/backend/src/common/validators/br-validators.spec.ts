import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateClientDto } from "../../clients/dto/create-client.dto";
import { UpdateClientDto } from "../../clients/dto/update-client.dto";
import { RegisterConsumerDto } from "../../consumer-auth/dto/consumer-dtos";
import { CreateStaffAppointmentDto } from "../../appointments/dto/create-staff-appointment.dto";

const errorsOf = async (cls: new () => object, data: object) =>
  (await validate(plainToInstance(cls, data))).map((e) => e.property);

describe("CreateClientDto", () => {
  const ok = { name: "Ana Souza", phone: "(11) 91234-5678" };

  it("aceita o que o formulário mascarado envia", async () => {
    expect(
      await errorsOf(CreateClientDto, {
        ...ok,
        email: "ana@x.com",
        cpf: "529.982.247-25",
        birthDate: "1990-05-20",
        tags: ["vip", " retorno "],
      }),
    ).toEqual([]);
  });

  it("recusa telefone impossível, CPF com dígito errado e nascimento no futuro/antigo demais", async () => {
    expect(await errorsOf(CreateClientDto, { ...ok, phone: "123" })).toContain("phone");
    expect(await errorsOf(CreateClientDto, { ...ok, phone: "(11) 11111-1111" })).toContain("phone");
    expect(await errorsOf(CreateClientDto, { ...ok, cpf: "111.111.111-11" })).toContain("cpf");
    expect(await errorsOf(CreateClientDto, { ...ok, cpf: "529.982.247-26" })).toContain("cpf");
    expect(await errorsOf(CreateClientDto, { ...ok, birthDate: "2999-01-01" })).toContain("birthDate");
    expect(await errorsOf(CreateClientDto, { ...ok, birthDate: "0001-01-01" })).toContain("birthDate");
    expect(await errorsOf(CreateClientDto, { ...ok, birthDate: "2020-13-45" })).toContain("birthDate");
  });

  // Regressão: "   " passava em @MinLength(2) e era gravado como nome vazio.
  it("nome só com espaços é recusado (trim antes da validação)", async () => {
    expect(await errorsOf(CreateClientDto, { ...ok, name: "    " })).toContain("name");
    expect(plainToInstance(CreateClientDto, { ...ok, name: "  Ana  " }).name).toBe("Ana");
  });

  // Regressão: tags sem teto — um único PATCH gravava milhares de tags gigantes.
  it("limita quantidade e tamanho das tags e descarta as vazias", async () => {
    expect(await errorsOf(CreateClientDto, { ...ok, tags: Array.from({ length: 21 }, (_, i) => `t${i}`) })).toContain("tags");
    expect(await errorsOf(CreateClientDto, { ...ok, tags: ["x".repeat(41)] })).toContain("tags");
    expect(plainToInstance(CreateClientDto, { ...ok, tags: ["a", "  ", ""] }).tags).toEqual(["a"]);
  });

  it("CPF e e-mail em branco (campo limpo no formulário) não são erro", async () => {
    expect(await errorsOf(UpdateClientDto, { cpf: null, email: null, birthDate: null })).toEqual([]);
    expect(await errorsOf(UpdateClientDto, { cpf: "", email: "" })).toEqual([]);
  });
});

describe("RegisterConsumerDto", () => {
  const ok = { name: "Bia", phone: "11912345678", email: "Bia@X.com", password: "12345678", consent: true };

  it("normaliza o e-mail e aceita telefone com DDI", async () => {
    const dto = plainToInstance(RegisterConsumerDto, { ...ok, phone: "+55 (11) 91234-5678" });
    expect(dto.email).toBe("bia@x.com");
    expect(await validate(dto)).toHaveLength(0);
  });

  it("recusa telefone lixo e senha acima de 72 caracteres", async () => {
    expect(await errorsOf(RegisterConsumerDto, { ...ok, phone: "00000000000" })).toContain("phone");
    expect(await errorsOf(RegisterConsumerDto, { ...ok, password: "a".repeat(73) })).toContain("password");
  });
});

describe("CreateStaffAppointmentDto", () => {
  it("recusa ids que não são UUID e telefone inválido", async () => {
    const errors = await errorsOf(CreateStaffAppointmentDto, {
      professionalId: "1' OR '1'='1",
      startAt: "2030-01-01T10:00:00Z",
      items: [{ serviceId: "x" }],
      clientPhone: "12",
    });
    expect(errors).toEqual(expect.arrayContaining(["professionalId", "items", "clientPhone"]));
  });
});
