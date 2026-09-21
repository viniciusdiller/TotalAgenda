import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { Prisma } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { isPlausibleBrazilianPhone, normalizePhone } from "../common/utils/phone.util";
import { resolvePagination, toPage } from "../common/pagination/paginate";
import { PaginationQueryDto } from "../common/pagination/pagination-query.dto";
import { LOCKOUT_THRESHOLD, lockoutDurationMs } from "../common/utils/lockout.util";
import {
  ChangeConsumerPasswordDto,
  ConsumerLoginDto,
  RegisterConsumerDto,
  UpdateConsumerProfileDto,
} from "./dto/consumer-dtos";
import { AuthenticatedConsumer, ConsumerJwtPayload } from "./types/consumer-auth-user";

const CONSUMER_TOKEN_EXPIRES_IN = "30d";
const BCRYPT_ROUNDS = 12;

// Hash fixo (calculado uma vez, no boot) só pra rodar bcrypt.compare contra ele quando não há
// conta/senha ou a conta está travada — mesmo custo de CPU de uma comparação real, senão o
// tempo de resposta denuncia o que a mensagem esconde. Instância própria (não compartilhada
// com AuthService): as duas identidades não devem ter o mesmo perfil de timing.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync("timing-attack-mitigation", BCRYPT_ROUNDS);

type Db = Prisma.TransactionClient | PrismaService;

@Injectable()
export class ConsumerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Cadastro E reivindicação de conta antiga, no mesmo formulário: se o telefone já tinha
  // cadastro sem senha (Consumer do fluxo antigo) ou só histórico de Client em algum salão, a
  // conta é reivindicada e o backfill liga os agendamentos antigos. Quem já tem senha recebe
  // 409 — nunca sobrescreve a senha de outra pessoa. Trade-off consciente (UX vs. segurança):
  // o cadastro revela se telefone/e-mail já têm conta; isso é aceito AQUI e não no login, onde
  // toda falha devolve o mesmo 401. Sem OTP (v1), possuir o telefone basta pra reivindicar.
  async register(dto: RegisterConsumerDto) {
    if (!dto.consent) {
      throw new BadRequestException("É necessário aceitar os termos e a política de privacidade.");
    }
    const phone = this.normalize(dto.phone);
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);

    const consumer = await this.prisma.$transaction(async (tx) => {
      const byPhone = await tx.consumer.findUnique({ where: { phone } });
      if (byPhone?.passwordHash) {
        throw new ConflictException("Já existe uma conta com esse telefone. Faça login.");
      }

      const emailOwner = await tx.consumer.findUnique({ where: { email }, select: { id: true } });
      if (emailOwner && emailOwner.id !== byPhone?.id) {
        throw new ConflictException("Este e-mail já está em uso.");
      }

      const target = byPhone
        ? await tx.consumer.update({ where: { id: byPhone.id }, data: { passwordHash, email } })
        : await tx.consumer.create({
            data: { phone, name: dto.name.trim(), email, passwordHash, consentedAt: new Date() },
          });

      await this.backfillCrossTenantLinks(tx, target.id, phone);
      return target;
    });

    return this.session(consumer);
  }

  // Única etapa que confere credencial. Identificador inválido, conta inexistente, conta sem
  // senha (ainda não reivindicada), conta travada e senha errada são indistinguíveis por
  // mensagem, status e tempo.
  async login(dto: ConsumerLoginDto) {
    const consumer = await this.findByIdentifier(dto.identifier);

    if (!consumer || !consumer.passwordHash) {
      await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH);
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    if (consumer.lockedUntil && consumer.lockedUntil.getTime() > Date.now()) {
      await bcrypt.compare(dto.password, DUMMY_PASSWORD_HASH);
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    const matches = await bcrypt.compare(dto.password, consumer.passwordHash);
    if (!matches) {
      await this.registerFailedLogin(consumer.id);
      throw new UnauthorizedException("Credenciais inválidas.");
    }

    if (consumer.failedLoginAttempts > 0 || consumer.lockedUntil) {
      await this.prisma.consumer.update({
        where: { id: consumer.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    return this.session(consumer);
  }

  async me(auth: AuthenticatedConsumer) {
    const consumer = await this.prisma.consumer.findUniqueOrThrow({
      where: { id: auth.consumerId },
      select: { id: true, name: true, phone: true, email: true },
    });
    return consumer;
  }

  // Salões onde este consumidor já agendou (um vínculo por salão), paginados no banco — o
  // "me" não devolve mais essa lista inteira, que crescia sem teto.
  async listEstablishments(auth: AuthenticatedConsumer, query: PaginationQueryDto) {
    const pagination = resolvePagination(query);
    const where = { consumerId: auth.consumerId };
    const [total, links] = await Promise.all([
      this.prisma.consumerTenantLink.count({ where }),
      this.prisma.consumerTenantLink.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
        select: { tenant: { select: { name: true, slug: true, logoUrl: true } } },
      }),
    ]);
    return toPage(
      links.map((link) => link.tenant),
      total,
      pagination,
    );
  }

  // Telefone não é editável aqui: é a chave de identidade usada pra ligar Client de tenants
  // diferentes, mudar isso silenciosamente orfanaria o vínculo.
  async updateProfile(auth: AuthenticatedConsumer, dto: UpdateConsumerProfileDto) {
    const data: Prisma.ConsumerUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();

    return this.prisma.consumer.update({
      where: { id: auth.consumerId },
      data,
      select: { id: true, name: true, phone: true, email: true },
    });
  }

  async changePassword(auth: AuthenticatedConsumer, dto: ChangeConsumerPasswordDto) {
    const consumer = await this.prisma.consumer.findUniqueOrThrow({ where: { id: auth.consumerId } });
    const matches = consumer.passwordHash
      ? await bcrypt.compare(dto.currentPassword, consumer.passwordHash)
      : false;
    if (!matches) {
      throw new BadRequestException("Senha atual incorreta.");
    }
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.prisma.consumer.update({ where: { id: consumer.id }, data: { passwordHash } });
    return { updated: true };
  }

  // LGPD: exclusão da conta global. Os Client por tenant permanecem (histórico do negócio),
  // só o vínculo e a identidade global somem.
  async deleteAccount(auth: AuthenticatedConsumer) {
    await this.prisma.consumer.delete({ where: { id: auth.consumerId } });
    return { deleted: true };
  }

  // Garante um Client no tenant e o vínculo com o consumidor. Chamado no agendamento e na
  // lista de espera. Idempotente por [tenantId, phone] / [consumerId, tenantId]. Aceita o
  // client transacional pra participar da transação de quem chama.
  async ensureLink(db: Db, consumerId: string, tenantId: string) {
    const consumer = await db.consumer.findUniqueOrThrow({ where: { id: consumerId } });

    const client = await db.client.upsert({
      where: { tenantId_phone: { tenantId, phone: consumer.phone } },
      update: { name: consumer.name },
      create: { tenantId, phone: consumer.phone, name: consumer.name },
    });
    await db.consumerTenantLink.upsert({
      where: { consumerId_tenantId: { consumerId, tenantId } },
      update: {},
      create: { consumerId, tenantId, clientId: client.id },
    });
    return client;
  }

  // Exceção deliberada e estreita à regra "sempre filtrar por tenantId": o propósito desta
  // query É unificar os registros do DONO deste telefone entre tenants — ele acabou de provar
  // posse do número completando o fluxo de login. Roda só na migração, nunca numa rota que
  // aceite telefone arbitrário de terceiro. NÃO altera Client.name (diferente do ensureLink,
  // que resincroniza o nome a cada agendamento): um backfill em lote não deve pisar em nome
  // que o staff de cada salão personalizou na própria ficha.
  private async backfillCrossTenantLinks(tx: Db, consumerId: string, phone: string) {
    const clients = await tx.client.findMany({ where: { phone }, select: { id: true, tenantId: true } });
    for (const client of clients) {
      await tx.consumerTenantLink.upsert({
        where: { consumerId_tenantId: { consumerId, tenantId: client.tenantId } },
        update: {},
        create: { consumerId, tenantId: client.tenantId, clientId: client.id },
      });
    }
  }

  private async registerFailedLogin(consumerId: string) {
    // Incremento atômico no banco (ver AuthService.registerFailedLogin): "lê, soma em
    // memória, grava" perde tentativas sob força bruta concorrente e o lockout nunca dispara.
    const updated = await this.prisma.consumer.update({
      where: { id: consumerId },
      data: { failedLoginAttempts: { increment: 1 } },
      select: { failedLoginAttempts: true },
    });

    if (updated.failedLoginAttempts >= LOCKOUT_THRESHOLD) {
      await this.prisma.consumer.update({
        where: { id: consumerId },
        data: { lockedUntil: new Date(Date.now() + lockoutDurationMs(updated.failedLoginAttempts)) },
      });
    }
  }

  private session(consumer: { id: string; name: string; phone: string; email: string | null }) {
    const payload: ConsumerJwtPayload = { sub: consumer.id, type: "consumer" };
    return {
      accessToken: this.jwtService.sign(payload, { expiresIn: CONSUMER_TOKEN_EXPIRES_IN }),
      consumer: { id: consumer.id, name: consumer.name, phone: consumer.phone, email: consumer.email },
    };
  }

  // E-mail (tem "@") ou telefone. Telefone implausível não lança 400: devolve null e cai no
  // mesmo caminho de "conta inexistente" (compare dummy + 401 genérico).
  private async findByIdentifier(identifier: string) {
    const value = identifier.trim();
    if (value.includes("@")) {
      return this.prisma.consumer.findUnique({ where: { email: value.toLowerCase() } });
    }
    const phone = normalizePhone(value);
    if (!isPlausibleBrazilianPhone(phone)) return null;
    return this.prisma.consumer.findUnique({ where: { phone } });
  }

  private normalize(raw: string) {
    const phone = normalizePhone(raw);
    if (!isPlausibleBrazilianPhone(phone)) {
      throw new BadRequestException("Telefone inválido.");
    }
    return phone;
  }
}
