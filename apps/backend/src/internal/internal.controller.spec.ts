import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { IS_PUBLIC_KEY } from "../common/decorators/public.decorator";
import { InternalAuthGuard } from "./internal-auth.guard";
import { InternalController } from "./internal.controller";
import { InternalTenantsQueryDto, PasswordResetLinkDto } from "./dto/internal.dto";

const opts = { whitelist: true, forbidNonWhitelisted: true };

describe("InternalController", () => {
  it("é @Public (fora do JWT de usuário) e protegido pelo InternalAuthGuard, com limite de taxa", () => {
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, InternalController)).toBe(true);
    expect(Reflect.getMetadata(GUARDS_METADATA, InternalController)).toContain(InternalAuthGuard);
    expect(Reflect.getMetadataKeys(InternalController).some((k: string) => k.startsWith("THROTTLER:LIMIT"))).toBe(true);
  });
});

describe("DTOs da API interna (fronteira)", () => {
  it("busca: texto curto e paginação com teto; campo extra é rejeitado", async () => {
    const ok = plainToInstance(InternalTenantsQueryDto, { search: "  zé ", page: "2", pageSize: "20" });
    expect(await validate(ok, opts)).toHaveLength(0);
    expect(ok.search).toBe("zé");
    expect(ok.page).toBe(2);

    for (const bad of [{ search: "x".repeat(101) }, { pageSize: "1000000" }, { page: "0" }, { tenantId: "outro" }]) {
      expect((await validate(plainToInstance(InternalTenantsQueryDto, bad), opts)).length).toBeGreaterThan(0);
    }
  });

  it("redefinição: exige o ator; rejeita vazio, gigante e campos extras (ex.: um id de usuário)", async () => {
    expect(await validate(plainToInstance(PasswordResetLinkDto, { actor: "suporte@total.com" }), opts)).toHaveLength(0);
    for (const bad of [{}, { actor: "" }, { actor: "a".repeat(255) }, { actor: "s@t.com", userId: "x" }]) {
      expect((await validate(plainToInstance(PasswordResetLinkDto, bad), opts)).length).toBeGreaterThan(0);
    }
  });
});
