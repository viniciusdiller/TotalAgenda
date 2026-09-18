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
import { LOCKOUT_THRESHOLD, lockoutDurationMs } from "../common/utils/lockout.util";
import {
  ChangeConsumerPasswordDto,
  ConsumerLoginDto,
  ConsumerLoginStartDto,
  ConsumerSetPasswordMigrationDto,
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

export type LoginStartStatus = "register" | "needs_password_setup" | "password_required";

@Injectable()
export class ConsumerAuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  // Primeira etapa do login: só decide qual formulário mostrar (senha / criar senha /
  // cadastro). Trade-off consciente de UX vs. segurança: isto revela se um telefone tem conta
  // e se já tem senha. É um sinal mais estreito que o bug anterior (404 vs. sucesso NO MEIO de
  // uma tentativa de credencial), pois aqui nenhuma credencial é testada — o telefone é o
  // "usuário" do produto, não um segredo — e é o mesmo tipo de sinal que qualquer fluxo de
  // "esqueci a senha" expõe. O que a regra de enumeração protege de verdade (não vazar
  // existência enquanto uma senha está sendo adivinhada) fica intacto: o passo que roda
  // bcrypt.compare (login) devolve sempre o mesmo 401 genérico, e tem rate limit + lockout.
  async loginStart(dto: ConsumerLoginStartDto): Promise<{ status: LoginStartStatus }> {
    const phone = this.normalize(dto.phone);
    const consumer = await this.prisma.consumer.findUnique({
      where: { phone },
      select: { passwordHash: true },
    });
    if (consumer) {
      return { status: consumer.passwordHash ? "password_required" : "needs_password_setup" };
    }

    // Checagem cross-tenant deliberada e estreita (exceção documentada à regra "sempre
    // filtrar por tenantId"): só decide "novo de verdade" vs. "já é cliente de algum salão,
    // só nunca criou a identidade global". Devolve um boolean, nunca qual tenant.
    const hasHistory = await this.prisma.client.findFirst({ where: { phone }, select: { id: true } });
    return { status: hasHistory ? "needs_password_setup" : "register" };
  }

  async register(dto: RegisterConsumerDto) {
    if (!dto.consent) {
      throw new BadRequestException("É necessário aceitar os termos e a política de privacidade.");
    }
    const phone = this.normalize(dto.phone);
    const existing = await this.prisma.consumer.findUnique({ where: { phone }, select: { id: true } });
    if (existing) {
      throw new ConflictException("Já existe uma conta com esse telefone. Faça login.");
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const consumer = await this.prisma.consumer.create({
      data: {
        phone,
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        passwordHash,
        consentedAt: new Date(),
      },
    });
    return this.session(consumer);
  }

  // Única etapa que confere credencial. Conta inexistente, conta sem senha (ainda não
  // migrada), conta travada e senha errada são indistinguíveis por mensagem, status e tempo —
  // só o loginStart pode sugerir "crie sua senha".
  async login(dto: ConsumerLoginDto) {
    const phone = this.normalize(dto.phone);
    const consumer = await this.prisma.consumer.findUnique({ where: { phone } });

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

  // Migração de conta do fluxo antigo (só telefone): a pessoa acabou de digitar o telefone no
  // loginStart e agora cria a senha. Sem token de convite — o fluxo é síncrono e o modelo de
  // confiança ("v1 sem OTP": possuir o telefone basta) é o mesmo já aceito no resto do
  // projeto. Nunca sobrescreve uma senha existente: isso seria trocar a senha de outra pessoa
  // provando só posse do telefone.
  async setPasswordForMigration(dto: ConsumerSetPasswordMigrationDto) {
    if (!dto.consent) {
      throw new BadRequestException("É necessário aceitar os termos e a política de privacidade.");
    }
    const phone = this.normalize(dto.phone);
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const email = dto.email.trim().toLowerCase();

    const consumer = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.consumer.findUnique({ where: { phone } });

      if (existing?.passwordHash) {
        throw new ConflictException("Esta conta já tem senha definida. Faça login.");
      }

      let target = existing;
      if (existing) {
        target = await tx.consumer.update({ where: { id: existing.id }, data: { passwordHash, email } });
      } else {
        // Nome vem do Client mais recentemente atualizado com este telefone (heurística
        // deliberada: não há "tenant certo" pra preferir aqui).
        const source = await tx.client.findFirst({
          where: { phone },
          orderBy: { updatedAt: "desc" },
          select: { name: true },
        });
        if (!source) {
          throw new BadRequestException("Nenhum histórico encontrado para este telefone. Crie uma conta.");
        }
        target = await tx.consumer.create({
          data: { phone, name: source.name, email, passwordHash, consentedAt: new Date() },
        });
      }

      await this.backfillCrossTenantLinks(tx, target.id, phone);
      return target;
    });

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

  private normalize(raw: string) {
    const phone = normalizePhone(raw);
    if (!isPlausibleBrazilianPhone(phone)) {
      throw new BadRequestException("Telefone inválido.");
    }
    return phone;
  }
}
