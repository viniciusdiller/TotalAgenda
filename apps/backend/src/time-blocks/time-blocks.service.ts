import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateTimeBlockDto } from "./dto/create-time-block.dto";

@Injectable()
export class TimeBlocksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateTimeBlockDto) {
    const professional = await this.prisma.professional.findFirst({
      where: { id: dto.professionalId, tenantId },
    });
    if (!professional) {
      throw new NotFoundException("Profissional não encontrado.");
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (startAt >= endAt) {
      throw new BadRequestException("O início do bloqueio deve ser anterior ao término.");
    }

    return this.prisma.timeBlock.create({
      data: {
        tenantId,
        professionalId: dto.professionalId,
        startAt,
        endAt,
        reason: dto.reason,
      },
    });
  }

  findByProfessional(tenantId: string, professionalId: string) {
    return this.prisma.timeBlock.findMany({
      where: { tenantId, professionalId },
      orderBy: { startAt: "asc" },
    });
  }

  async remove(tenantId: string, id: string) {
    const block = await this.prisma.timeBlock.findFirst({ where: { id, tenantId } });
    if (!block) {
      throw new NotFoundException("Bloqueio não encontrado.");
    }
    await this.prisma.timeBlock.delete({ where: { id } });
  }

  async findOneOrThrow(tenantId: string, id: string) {
    const block = await this.prisma.timeBlock.findFirst({ where: { id, tenantId } });
    if (!block) {
      throw new NotFoundException("Bloqueio não encontrado.");
    }
    return block;
  }
}
