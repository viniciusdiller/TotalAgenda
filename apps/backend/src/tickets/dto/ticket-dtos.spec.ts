import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AddTicketItemDto } from "./ticket-dtos";

// Testa a validação da própria classe (como o ValidationPipe global processa), não o
// service — o bug era inteiramente na declaração dos decorators do DTO.
async function validateDto(plain: Record<string, unknown>) {
  const dto = plainToInstance(AddTicketItemDto, plain);
  return validate(dto);
}

describe("AddTicketItemDto — unitPriceCents", () => {
  // Regressão: @ValidateIf((o) => o.kind === "CUSTOM") fazia os decorators de unitPriceCents
  // serem pulados por completo pra SERVICE/PRODUCT — nem tipo nem sinal eram checados,
  // deixando um staff mandar um override de preço negativo/absurdo pro catálogo.
  it("rejeita unitPriceCents negativo em item de kind SERVICE", async () => {
    const errors = await validateDto({
      kind: "SERVICE",
      serviceId: "svc-1",
      unitPriceCents: -100000,
    });
    expect(errors.some((e) => e.property === "unitPriceCents")).toBe(true);
  });

  it("rejeita unitPriceCents não-inteiro em item de kind PRODUCT", async () => {
    const errors = await validateDto({
      kind: "PRODUCT",
      productId: "prod-1",
      unitPriceCents: 10.5,
    });
    expect(errors.some((e) => e.property === "unitPriceCents")).toBe(true);
  });

  it("aceita SERVICE sem unitPriceCents (usa o preço do catálogo)", async () => {
    const errors = await validateDto({ kind: "SERVICE", serviceId: "svc-1" });
    expect(errors.some((e) => e.property === "unitPriceCents")).toBe(false);
  });

  it("aceita override de unitPriceCents válido (inteiro >= 0) em SERVICE", async () => {
    const errors = await validateDto({
      kind: "SERVICE",
      serviceId: "svc-1",
      unitPriceCents: 4500,
    });
    expect(errors.some((e) => e.property === "unitPriceCents")).toBe(false);
  });

  it("exige unitPriceCents em CUSTOM", async () => {
    const errors = await validateDto({ kind: "CUSTOM", description: "Item avulso" });
    expect(errors.some((e) => e.property === "unitPriceCents")).toBe(true);
  });

  it("rejeita unitPriceCents negativo em CUSTOM", async () => {
    const errors = await validateDto({
      kind: "CUSTOM",
      description: "Item avulso",
      unitPriceCents: -1,
    });
    expect(errors.some((e) => e.property === "unitPriceCents")).toBe(true);
  });
});
