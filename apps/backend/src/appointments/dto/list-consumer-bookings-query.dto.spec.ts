import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ListConsumerBookingsQueryDto } from "./list-consumer-bookings-query.dto";

// Mesmas opções do ValidationPipe global.
async function check(plain: Record<string, unknown>) {
  const dto = plainToInstance(ListConsumerBookingsQueryDto, plain);
  return { dto, errors: await validate(dto, { whitelist: true, forbidNonWhitelisted: true }) };
}

describe("ListConsumerBookingsQueryDto", () => {
  it("converte page/pageSize de string (query string) para número", async () => {
    const { dto, errors } = await check({ page: "2", pageSize: "20", scope: "past" });
    expect(errors).toHaveLength(0);
    expect(dto.page).toBe(2);
    expect(dto.pageSize).toBe(20);
  });

  // Regressão de boundary: sem teto, ?pageSize=1000000 viraria leitura sem limite.
  it("rejeita pageSize acima do teto, page < 1 e scope desconhecido", async () => {
    expect((await check({ pageSize: "1000000" })).errors.some((e) => e.property === "pageSize")).toBe(true);
    expect((await check({ page: "0" })).errors.some((e) => e.property === "page")).toBe(true);
    expect((await check({ scope: "tudo" })).errors.some((e) => e.property === "scope")).toBe(true);
  });

  it("rejeita tenantSlug com caracteres fora do padrão de slug", async () => {
    expect((await check({ tenantSlug: "../etc" })).errors.some((e) => e.property === "tenantSlug")).toBe(true);
  });
});
