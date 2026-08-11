import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { Role } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { PlanLimitService } from "../billing/plan-limit.service";
import { hasOverlappingIntervals } from "../common/utils/interval.util";
import { CreateProfessionalDto } from "./dto/create-professional.dto";
import { UpdateProfessionalDto } from "./dto/update-professional.dto";
import { SetWorkingHoursDto } from "./dto/set-working-hours.dto";

const BCRYPT_ROUNDS = 12;

@Injectable()
export class ProfessionalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planLimitService: PlanLimitService,
  ) {}

  async create(tenantId: string, dto: CreateProfessionalDto) {
    await this.planLimitService.assertCanAddProfessional(tenantId);

    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException("Já existe uma conta com este e-mail.");
    }

    const passwordHash = await bcrypt.hash(dto.initialPassword, BCRYPT_ROUNDS);

    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          tenantId,
          email: dto.email,
          passwordHash,
          name: dto.name,
          role: Role.PROFESSIONAL,
        },
      });

      return tx.professional.create({
        data: { tenantId, userId: user.id, bio: dto.bio },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
    });
  }

  findAllByTenant(tenantId: string) {
    return this.prisma.professional.findMany({
      where: { tenantId },
      include: { user: { select: { id: true, name: true, email: true } }, workingHours: true },
    });
  }

  async findOneOrThrow(tenantId: string, professionalId: string) {
    const professional = await this.prisma.professional.findFirst({
      where: { id: professionalId, tenantId },
      include: { user: { select: { id: true, name: true, email: true } }, workingHours: true },
    });

    if (!professional) {
      throw new NotFoundException("Profissional não encontrado.");
    }

    return professional;
  }

  async update(tenantId: string, professionalId: string, dto: UpdateProfessionalDto) {
    const professional = await this.findOneOrThrow(tenantId, professionalId);

    if (dto.isActive === true && !professional.isActive) {
      await this.planLimitService.assertCanAddProfessional(tenantId);
    }

    return this.prisma.professional.update({
      where: { id: professional.id },
      data: { bio: dto.bio, isActive: dto.isActive },
    });
  }

  async setWorkingHours(tenantId: string, professionalId: string, dto: SetWorkingHoursDto) {
    const professional = await this.findOneOrThrow(tenantId, professionalId);

    for (const interval of dto.intervals) {
      if (interval.startMinute >= interval.endMinute) {
        throw new BadRequestException(
          "O horário de início deve ser anterior ao horário de término.",
        );
      }
    }

    const byWeekday = new Map<string, typeof dto.intervals>();
    for (const interval of dto.intervals) {
      const list = byWeekday.get(interval.weekday) ?? [];
      list.push(interval);
      byWeekday.set(interval.weekday, list);
    }
    for (const [weekday, intervals] of byWeekday) {
      if (hasOverlappingIntervals(intervals)) {
        throw new BadRequestException(`Horários sobrepostos para ${weekday}.`);
      }
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.workingHours.deleteMany({ where: { professionalId: professional.id } });
      if (dto.intervals.length === 0) {
        return [];
      }
      await tx.workingHours.createMany({
        data: dto.intervals.map((interval) => ({
          professionalId: professional.id,
          weekday: interval.weekday,
          startMinute: interval.startMinute,
          endMinute: interval.endMinute,
        })),
      });
      return tx.workingHours.findMany({ where: { professionalId: professional.id } });
    });
  }

  async findPublicByTenantSlugAndService(slug: string, serviceId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
    if (!tenant) {
      throw new NotFoundException("Negócio não encontrado.");
    }

    const professionalServices = await this.prisma.professionalService.findMany({
      where: {
        serviceId,
        isActive: true,
        service: { tenantId: tenant.id, isActive: true },
        professional: { tenantId: tenant.id, isActive: true },
      },
      include: { professional: { include: { user: { select: { name: true } } } } },
    });

    return professionalServices.map((ps) => ({
      id: ps.professional.id,
      name: ps.professional.user.name,
      bio: ps.professional.bio,
    }));
  }
}
