import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { PrismaService } from "../prisma/prisma.service";
import { isPlausibleBrazilianPhone, normalizePhone } from "../common/utils/phone.util";
import { ConsumerLoginDto, RegisterConsumerDto } from "./dto/consumer-dtos";
import { AuthenticatedConsumer, ConsumerJwtPayload } from "./types/consumer-auth-user";

const CONSUMER_TOKEN_EXPIRES_IN = "180d";

@Injectable()
export class ConsumerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterConsumerDto) {
    if (!dto.consent) {
      throw new BadRequestException("É necessário aceitar os termos e a política de privacidade.");
    }
    const phone = this.normalize(dto.phone);
    const existing = await this.prisma.consumer.findUnique({ where: { phone }, select: { id: true } });
    if (existing) {
      throw new ConflictException("Já existe uma conta com esse telefone. Faça login.");
    }
    const consumer = await this.prisma.consumer.create({
      data: {
        phone,
        name: dto.name.trim(),
        email: dto.email?.trim().toLowerCase() || null,
        consentedAt: new Date(),
      },
    });
    return this.session(consumer);
  }

  // v1 sem OTP — ver ClientAuthService para o racional. Ponto de extensão: trocar a busca
  // direta por gera OTP -> verifica -> loga, sem tocar no guard nem no token.
  async login(dto: ConsumerLoginDto) {
    const phone = this.normalize(dto.phone);
    const consumer = await this.prisma.consumer.findUnique({ where: { phone } });
    if (!consumer) {
      throw new NotFoundException("Nenhuma conta encontrada com esse telefone.");
    }
    return this.session(consumer);
  }

  async me(auth: AuthenticatedConsumer) {
    const consumer = await this.prisma.consumer.findUniqueOrThrow({
      where: { id: auth.consumerId },
      include: {
        tenantLinks: {
          include: { tenant: { select: { name: true, slug: true, logoUrl: true } } },
        },
      },
    });
    return {
      id: consumer.id,
      name: consumer.name,
      phone: consumer.phone,
      email: consumer.email,
      establishments: consumer.tenantLinks.map((link) => link.tenant),
    };
  }

  // LGPD: exclusão da conta global. Os Client por tenant permanecem (histórico do negócio),
  // só o vínculo e a identidade global somem.
  async deleteAccount(auth: AuthenticatedConsumer) {
    await this.prisma.consumer.delete({ where: { id: auth.consumerId } });
    return { deleted: true };
  }

  // Garante um Client no tenant e o vínculo com o consumidor. Chamado quando o consumidor
  // agenda por dentro do marketplace. Idempotente por [tenantId, phone] / [consumerId, tenantId].
  async ensureLink(consumerId: string, tenantId: string) {
    const consumer = await this.prisma.consumer.findUniqueOrThrow({ where: { id: consumerId } });

    return this.prisma.$transaction(async (tx) => {
      const client = await tx.client.upsert({
        where: { tenantId_phone: { tenantId, phone: consumer.phone } },
        update: { name: consumer.name },
        create: { tenantId, phone: consumer.phone, name: consumer.name },
      });
      await tx.consumerTenantLink.upsert({
        where: { consumerId_tenantId: { consumerId, tenantId } },
        update: {},
        create: { consumerId, tenantId, clientId: client.id },
      });
      return client;
    });
  }

  async tenantIdBySlug(slug: string): Promise<string | null> {
    const tenant = await this.prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
    return tenant?.id ?? null;
  }

  private session(consumer: { id: string; name: string; phone: string; email: string | null }) {
    const payload: ConsumerJwtPayload = { sub: consumer.id, type: "consumer" };
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: CONSUMER_TOKEN_EXPIRES_IN }),
      consumer: { id: consumer.id, name: consumer.name, phone: consumer.phone, email: consumer.email },
    };
  }

  private normalize(raw: string) {
    const phone = normalizePhone(raw);
    if (!isPlausibleBrazilianPhone(phone)) {
      throw new BadRequestException("Telefone inválido.");
    }
    return phone;
  }
}
