import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { RegisterPayoutDto } from "./finance-dtos";

const pro = "3f2b8c1e-8a3d-4c55-9d5e-0a1b2c3d4e5f";
const key = "8f6d2c1e-5b3a-4c7d-9e0f-1a2b3c4d5e6f";

async function bad(payload: Record<string, unknown>) {
  const errors = await validate(plainToInstance(RegisterPayoutDto, payload));
  return errors.map((e) => e.property);
}

describe("RegisterPayoutDto (fronteira do repasse)", () => {
  it("aceita um repasse completo", async () => {
    expect(await bad({ professionalId: pro, amountCents: 1500, note: "Pix", paidOn: "2026-10-06", requestKey: key })).toEqual([]);
  });

  it("só professionalId e valor já bastam (data e chave são opcionais)", async () => {
    expect(await bad({ professionalId: pro, amountCents: 1 })).toEqual([]);
  });

  it.each<[Record<string, unknown>, string, string]>([
    [{ professionalId: "1 OR 1=1", amountCents: 100 }, "professionalId", "id que não é UUID"],
    [{ professionalId: pro, amountCents: 0 }, "amountCents", "valor zero"],
    [{ professionalId: pro, amountCents: -50 }, "amountCents", "valor negativo"],
    [{ professionalId: pro, amountCents: 10.5 }, "amountCents", "centavo fracionado"],
    [{ professionalId: pro, amountCents: "100" }, "amountCents", "valor como texto"],
    [{ professionalId: pro, amountCents: 100_000_001 }, "amountCents", "acima do teto"],
    [{ professionalId: pro, amountCents: 100, paidOn: "06/10/2026" }, "paidOn", "data em formato BR"],
    [{ professionalId: pro, amountCents: 100, paidOn: "2026-10-06T10:00:00Z" }, "paidOn", "data com hora"],
    [{ professionalId: pro, amountCents: 100, paidOn: "ontem" }, "paidOn", "texto livre"],
    [{ professionalId: pro, amountCents: 100, requestKey: "abc" }, "requestKey", "chave não-UUID"],
    [{ professionalId: pro, amountCents: 100, note: "x".repeat(201) }, "note", "observação acima de 200"],
    [{ professionalId: pro, amountCents: 100, note: { $ne: "" } }, "note", "objeto no lugar de texto"],
  ])("rejeita %j (campo %s: %s)", async (payload, field) => {
    expect(await bad(payload)).toContain(field);
  });
});
