import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { LoginDto } from "../../auth/dto/login.dto";
import { CreateProfessionalDto } from "../../professionals/dto/create-professional.dto";
import { UpdateProfessionalDto } from "../../professionals/dto/update-professional.dto";

// Regressão: o login buscava `user.email` exatamente como digitado, então "Foo@x.com" e
// "foo@x.com" eram contas diferentes e a checagem de e-mail duplicado se contornava só
// trocando a caixa.
describe("NormalizeEmail nos DTOs de User", () => {
  it("LoginDto: minúsculo e sem espaços nas bordas", () => {
    const dto = plainToInstance(LoginDto, { email: "  Foo@Example.COM ", password: "x" });
    expect(dto.email).toBe("foo@example.com");
  });

  it("CreateProfessionalDto: minúsculo", async () => {
    const dto = plainToInstance(CreateProfessionalDto, {
      name: "Ana",
      email: "ANA@Salao.com",
      initialPassword: "12345678",
    });
    expect(dto.email).toBe("ana@salao.com");
    expect(await validate(dto)).toHaveLength(0);
  });

  it("UpdateProfessionalDto: normaliza quando enviado e não inventa quando ausente", () => {
    expect(plainToInstance(UpdateProfessionalDto, { email: "A@B.com" }).email).toBe("a@b.com");
    expect(plainToInstance(UpdateProfessionalDto, {}).email).toBeUndefined();
  });

  it("valor não-string passa intacto para o @IsEmail rejeitar", async () => {
    const dto = plainToInstance(LoginDto, { email: 123, password: "x" });
    expect(dto.email).toBe(123 as unknown as string);
    expect((await validate(dto)).length).toBeGreaterThan(0);
  });
});
