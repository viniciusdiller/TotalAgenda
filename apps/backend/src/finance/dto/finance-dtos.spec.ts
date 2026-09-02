import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdateCategoryDto } from "./finance-dtos";

// Regressão: isArchived era @IsString() num campo que é boolean — um boolean de verdade
// (o formato natural do payload) era rejeitado pela validação, e a string "true" passava e
// quebrava depois no Prisma (coluna Boolean).
describe("UpdateCategoryDto — isArchived", () => {
  it("aceita um boolean de verdade", async () => {
    const dto = plainToInstance(UpdateCategoryDto, { isArchived: true });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "isArchived")).toBe(false);
  });

  it("rejeita a string \"true\" (não é o tipo declarado)", async () => {
    const dto = plainToInstance(UpdateCategoryDto, { isArchived: "true" });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === "isArchived")).toBe(true);
  });
});
