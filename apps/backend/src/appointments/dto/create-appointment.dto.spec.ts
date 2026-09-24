import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateAppointmentDto } from "./create-appointment.dto";

// Mesmas opções do ValidationPipe global (whitelist + forbidNonWhitelisted).
async function validateDto(plain: Record<string, unknown>) {
  const dto = plainToInstance(CreateAppointmentDto, plain);
  return validate(dto, { whitelist: true, forbidNonWhitelisted: true });
}

const validBase = {
  professionalId: "3f2b8c1e-8a3d-4c55-9d5e-0a1b2c3d4e5f",
  serviceId: "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  startAt: "2026-01-01T10:00:00-03:00",
};

describe("CreateAppointmentDto", () => {
  it("aceita o payload válido", async () => {
    const errors = await validateDto(validBase);
    expect(errors).toHaveLength(0);
  });

  // Regressão: antes o body trazia clientName/clientPhone e o service os usava direto pra
  // criar/achar o Client do tenant — qualquer um podia registrar um agendamento em nome de
  // qualquer telefone. Agora a identidade vem só da sessão do Consumer; um body que ainda
  // mande esses campos tem que ser recusado (400), não ignorado em silêncio.
  it("rejeita clientName/clientPhone no body (identidade vem da sessão, não do cliente HTTP)", async () => {
    const errors = await validateDto({ ...validBase, clientName: "Fulano", clientPhone: "11988887777" });
    expect(errors.some((e) => e.property === "clientName")).toBe(true);
    expect(errors.some((e) => e.property === "clientPhone")).toBe(true);
  });
});
