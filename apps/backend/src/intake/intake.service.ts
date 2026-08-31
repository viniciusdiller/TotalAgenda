import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { IntakeFieldDto, UpsertIntakeFormDto } from "./dto/upsert-intake-form.dto";
import { SubmitIntakeResponseDto } from "./dto/submit-intake-response.dto";

@Injectable()
export class IntakeService {
  constructor(private readonly prisma: PrismaService) {}

  listForms(tenantId: string) {
    return this.prisma.intakeForm.findMany({
      where: { tenantId },
      orderBy: { createdAt: "asc" },
    });
  }

  async createForm(tenantId: string, dto: UpsertIntakeFormDto) {
    this.assertUniqueKeys(dto.fields);
    return this.prisma.intakeForm.create({
      data: {
        tenantId,
        name: dto.name.trim(),
        fields: dto.fields as unknown as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async updateForm(tenantId: string, id: string, dto: UpsertIntakeFormDto) {
    await this.getFormOrThrow(tenantId, id);
    this.assertUniqueKeys(dto.fields);
    return this.prisma.intakeForm.update({
      where: { id },
      data: {
        name: dto.name.trim(),
        fields: dto.fields as unknown as Prisma.InputJsonValue,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async submitResponse(tenantId: string, dto: SubmitIntakeResponseDto) {
    const [form, client] = await Promise.all([
      this.getFormOrThrow(tenantId, dto.formId),
      this.prisma.client.findFirst({
        where: { id: dto.clientId, tenantId },
        select: { id: true },
      }),
    ]);
    if (!client) {
      throw new NotFoundException("Cliente não encontrado.");
    }

    if (dto.appointmentId) {
      const appointment = await this.prisma.appointment.findFirst({
        where: { id: dto.appointmentId, tenantId, clientId: dto.clientId },
        select: { id: true },
      });
      if (!appointment) {
        throw new BadRequestException("Atendimento não pertence a este cliente.");
      }
    }

    const fields = form.fields as unknown as IntakeFieldDto[];
    const answers = this.sanitizeAnswers(fields, dto.answers);

    return this.prisma.intakeResponse.create({
      data: {
        tenantId,
        formId: dto.formId,
        clientId: dto.clientId,
        appointmentId: dto.appointmentId,
        answers: answers as Prisma.InputJsonValue,
      },
    });
  }

  private async getFormOrThrow(tenantId: string, id: string) {
    const form = await this.prisma.intakeForm.findFirst({ where: { id, tenantId } });
    if (!form) {
      throw new NotFoundException("Ficha não encontrada.");
    }
    return form;
  }

  private assertUniqueKeys(fields: IntakeFieldDto[]) {
    const keys = fields.map((f) => f.key.trim());
    if (new Set(keys).size !== keys.length) {
      throw new BadRequestException("As chaves dos campos da ficha devem ser únicas.");
    }
    for (const field of fields) {
      if (field.type === "select" && (!field.options || field.options.length === 0)) {
        throw new BadRequestException(`O campo "${field.label}" (select) precisa de opções.`);
      }
    }
  }

  // Só aceita chaves declaradas no form; coage tipos; exige campos required.
  private sanitizeAnswers(fields: IntakeFieldDto[], raw: Record<string, unknown>) {
    const result: Record<string, string | boolean> = {};
    for (const field of fields) {
      const value = raw[field.key];
      if (value === undefined || value === null || value === "") {
        if (field.required) {
          throw new BadRequestException(`O campo "${field.label}" é obrigatório.`);
        }
        continue;
      }
      if (field.type === "boolean") {
        result[field.key] = value === true || value === "true";
      } else if (field.type === "select") {
        if (!field.options?.includes(String(value))) {
          throw new BadRequestException(`Valor inválido para "${field.label}".`);
        }
        result[field.key] = String(value);
      } else {
        result[field.key] = String(value).slice(0, 4000);
      }
    }
    return result;
  }
}
