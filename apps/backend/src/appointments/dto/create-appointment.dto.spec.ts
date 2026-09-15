import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { CreateAppointmentDto } from "./create-appointment.dto";

async function validateDto(plain: Record<string, unknown>) {
  const dto = plainToInstance(CreateAppointmentDto, plain);
  return validate(dto);
}

const validBase = {
  professionalId: "prof-1",
  serviceId: "svc-1",
  startAt: "2026-01-01T10:00:00-03:00",
  clientName: "Cliente Teste",
  clientPhone: "11988887777",
};

// Regressão (auditoria de segurança): este DTO é o endpoint público SEM autenticação
// (POST /public/tenants/:slug/bookings) — clientName/clientPhone não tinham @MaxLength,
// então uma string de centenas de KB repetida (só limitado pelo throttle de 10/min) virava
// storage abuse em Client/Appointment.
describe("CreateAppointmentDto", () => {
  it("aceita o payload válido", async () => {
    const errors = await validateDto(validBase);
    expect(errors).toHaveLength(0);
  });

  it("rejeita clientName acima do teto", async () => {
    const errors = await validateDto({ ...validBase, clientName: "a".repeat(200) });
    expect(errors.some((e) => e.property === "clientName")).toBe(true);
  });

  it("rejeita clientPhone acima do teto", async () => {
    const errors = await validateDto({ ...validBase, clientPhone: "1".repeat(100) });
    expect(errors.some((e) => e.property === "clientPhone")).toBe(true);
  });
});
