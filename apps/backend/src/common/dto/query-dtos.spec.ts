import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import {
  ClientSearchQueryDto,
  RangeByProfessionalQueryDto,
  TimeBlocksQueryDto,
} from "./query-dtos";

const isValid = (cls: new () => object, plain: unknown) =>
  validateSync(plainToInstance(cls, plain), { whitelist: true, forbidNonWhitelisted: true }).length === 0;

describe("DTOs de @Query", () => {
  it("search aceito como string e recusado como array/objeto (?search=a&search=b, ?search[x]=1)", () => {
    expect(isValid(ClientSearchQueryDto, { search: "ana" })).toBe(true);
    expect(isValid(ClientSearchQueryDto, {})).toBe(true);
    expect(isValid(ClientSearchQueryDto, { search: ["a", "b"] })).toBe(false);
    expect(isValid(ClientSearchQueryDto, { search: { x: "1" } })).toBe(false);
    expect(isValid(ClientSearchQueryDto, { search: "x".repeat(101) })).toBe(false);
  });

  // Regressão: professionalId como objeto ia cru pro Prisma e virava 500 (PrismaClientValidationError
  // não é capturado pelo PrismaExceptionFilter).
  it("professionalId só string; objeto/array viram 400 em vez de 500", () => {
    const range = { from: "2026-08-01T00:00:00.000Z", to: "2026-08-31T00:00:00.000Z" };
    expect(isValid(RangeByProfessionalQueryDto, { ...range, professionalId: "p-1" })).toBe(true);
    expect(isValid(RangeByProfessionalQueryDto, { ...range, professionalId: { not: "x" } })).toBe(false);
    expect(isValid(RangeByProfessionalQueryDto, { ...range, professionalId: ["a"] })).toBe(false);
    expect(isValid(TimeBlocksQueryDto, { professionalId: { a: 1 } })).toBe(false);
  });

  it("intervalo exige datas ISO válidas e recusa parâmetros não declarados", () => {
    expect(isValid(RangeByProfessionalQueryDto, { from: "lixo", to: "2026-08-31" })).toBe(false);
    expect(isValid(RangeByProfessionalQueryDto, { from: "2026-08-01" })).toBe(false);
    expect(
      isValid(RangeByProfessionalQueryDto, { from: "2026-08-01", to: "2026-08-31", tenantId: "outro" }),
    ).toBe(false);
  });
});
