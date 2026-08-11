import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Role } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { generateUniqueSlug } from "../common/utils/slug.util";
import { RegisterOwnerDto } from "./dto/register-owner.dto";
import { LoginDto } from "./dto/login.dto";
import { JwtPayload } from "./types/auth-user";

const TRIAL_DAYS = 14;
const BCRYPT_ROUNDS = 12;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Cadastro trial-apenas: nunca cria uma Subscription (o tenant fica sem assinatura até
  // pagar). Isso é intencional agora que o checkout real vive só no Admin-TotalSoftware —
  // manter esse método criando só o trial evita um registro de Subscription "fantasma"
  // aqui desalinhado com o Stripe real de lá. Quando o trial expira sem conversão externa
  // (ver src/webhooks), o TenantBillingGuard já bloqueia o acesso via computeBillingStatus.
  async registerOwner(dto: RegisterOwnerDto) {
    const existingUser = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingUser) {
      throw new ConflictException("Já existe uma conta com este e-mail.");
    }

    const slug = await generateUniqueSlug(dto.businessName, async (candidate) => {
      const existing = await this.prisma.tenant.findUnique({ where: { slug: candidate } });
      return !!existing;
    });

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

    const { tenant, user } = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { name: dto.businessName, slug, trialEndsAt },
      });

      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: dto.email,
          passwordHash,
          name: dto.ownerName,
          role: Role.OWNER,
        },
      });

      return { tenant, user };
    });

    return this.buildAuthResponse(user.id, tenant.id, user.role, user.email, user.name);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { professional: true },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    return this.buildAuthResponse(
      user.id,
      user.tenantId,
      user.role,
      user.email,
      user.name,
      user.professional?.id,
    );
  }

  private buildAuthResponse(
    userId: string,
    tenantId: string,
    role: Role,
    email: string,
    name: string,
    professionalId?: string,
  ) {
    const payload: JwtPayload = { sub: userId, tenantId, role, professionalId };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: { id: userId, tenantId, role, email, name, professionalId },
    };
  }
}
