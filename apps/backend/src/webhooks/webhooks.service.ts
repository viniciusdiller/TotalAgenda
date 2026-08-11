import { randomBytes } from "crypto";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import * as bcrypt from "bcrypt";
import { PlanTier, Role, SubscriptionStatus } from "@totalagenda/database";
import { PrismaService } from "../prisma/prisma.service";
import { generateUniqueSlug } from "../common/utils/slug.util";
import { SincronizacaoStatus, TotalSoftwareWebhookDto } from "./dto/totalsoftware-webhook.dto";

const BCRYPT_ROUNDS = 12;

const SYNC_STATUS_MAP: Record<SincronizacaoStatus, SubscriptionStatus> = {
  ativa: SubscriptionStatus.ACTIVE,
  cancelada: SubscriptionStatus.CANCELED,
  // Mantém o mesmo espírito de "PAST_DUE ainda concede acesso" que já existia para o
  // Stripe local: inadimplência é um período de graça, não um bloqueio imediato.
  inadimplente: SubscriptionStatus.PAST_DUE,
};

@Injectable()
export class WebhooksService {
  constructor(private readonly prisma: PrismaService) {}

  async provisionar(dto: TotalSoftwareWebhookDto) {
    const missing = ["nomeEmpresa", "responsavelNome", "responsavelEmail", "plano", "stripeCustomerId", "stripeSubscriptionId"].filter(
      (field) => !(dto as unknown as Record<string, unknown>)[field],
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Payload de provisionamento incompleto. Campos ausentes: ${missing.join(", ")}.`,
      );
    }

    const plano = dto.plano!;
    const tier = this.resolvePlanTier(plano.nome);
    const plan = await this.prisma.plan.findUnique({ where: { tier } });
    if (!plan) {
      throw new BadRequestException(
        `Plano "${plano.nome}" não está cadastrado localmente (rode o seed de planos).`,
      );
    }

    const status = dto.status ? SYNC_STATUS_MAP[dto.status] : SubscriptionStatus.ACTIVE;

    return this.prisma.$transaction(async (tx) => {
      let tenant = await tx.tenant.findUnique({ where: { externalCustomerId: dto.clienteId } });

      if (!tenant) {
        const existingUser = await tx.user.findUnique({ where: { email: dto.responsavelEmail! } });
        if (existingUser) {
          throw new ConflictException(
            `Já existe uma conta com o e-mail ${dto.responsavelEmail}. Não é possível provisionar um novo tenant.`,
          );
        }

        const slug = await generateUniqueSlug(dto.nomeEmpresa!, async (candidate) => {
          const existing = await tx.tenant.findUnique({ where: { slug: candidate } });
          return !!existing;
        });

        // Cliente pagante: não inicia trial. trialEndsAt fica no passado e é irrelevante
        // assim que a Subscription abaixo existir (computeBillingStatus prioriza a
        // assinatura sobre o trial).
        tenant = await tx.tenant.create({
          data: {
            name: dto.nomeEmpresa!,
            slug,
            externalCustomerId: dto.clienteId,
            trialEndsAt: new Date(),
          },
        });

        // Senha aleatória e descartada: quem provisiona o tenant é o Admin-TotalSoftware,
        // não um formulário de cadastro local. O responsável ainda não tem como logar até
        // existir um fluxo de "definir senha"/"esqueci minha senha" neste backend.
        const passwordHash = await bcrypt.hash(randomBytes(24).toString("hex"), BCRYPT_ROUNDS);
        await tx.user.create({
          data: {
            tenantId: tenant.id,
            email: dto.responsavelEmail!,
            passwordHash,
            name: dto.responsavelNome!,
            role: Role.OWNER,
          },
        });
      }

      await tx.subscription.upsert({
        where: { tenantId: tenant.id },
        update: {
          planId: plan.id,
          status,
          stripeCustomerId: dto.stripeCustomerId!,
          stripeSubscriptionId: dto.stripeSubscriptionId!,
          cancelAtPeriodEnd: false,
        },
        create: {
          tenantId: tenant.id,
          planId: plan.id,
          status,
          stripeCustomerId: dto.stripeCustomerId!,
          stripeSubscriptionId: dto.stripeSubscriptionId!,
        },
      });

      return { tenantId: tenant.id, slug: tenant.slug };
    });
  }

  async sincronizarStatus(dto: TotalSoftwareWebhookDto) {
    const missing = ["status", "stripeSubscriptionId"].filter(
      (field) => !(dto as unknown as Record<string, unknown>)[field],
    );
    if (missing.length > 0) {
      throw new BadRequestException(
        `Payload de sincronização incompleto. Campos ausentes: ${missing.join(", ")}.`,
      );
    }

    const tenant = await this.prisma.tenant.findUnique({ where: { externalCustomerId: dto.clienteId } });
    if (!tenant) {
      throw new NotFoundException(`Nenhum tenant encontrado para o clienteId ${dto.clienteId}.`);
    }

    const subscription = await this.prisma.subscription.findUnique({ where: { tenantId: tenant.id } });
    if (!subscription) {
      throw new NotFoundException(
        `Tenant ${tenant.id} ainda não tem assinatura provisionada; aguarde o evento de provisionamento.`,
      );
    }

    let currentPeriodEnd: Date | null = null;
    if (dto.proximaCobranca) {
      currentPeriodEnd = new Date(dto.proximaCobranca);
      if (Number.isNaN(currentPeriodEnd.getTime())) {
        throw new BadRequestException(`proximaCobranca inválida: ${dto.proximaCobranca}.`);
      }
    }

    await this.prisma.subscription.update({
      where: { tenantId: tenant.id },
      data: {
        status: SYNC_STATUS_MAP[dto.status!],
        stripeSubscriptionId: dto.stripeSubscriptionId!,
        currentPeriodEnd,
        cancelAtPeriodEnd: dto.status === "cancelada",
      },
    });

    return { tenantId: tenant.id };
  }

  private resolvePlanTier(nome: string): PlanTier {
    const normalized = nome
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toUpperCase()
      .trim();

    const tier = (Object.values(PlanTier) as string[]).find((value) => value === normalized);
    if (!tier) {
      throw new BadRequestException(`Plano "${nome}" não reconhecido.`);
    }
    return tier as PlanTier;
  }
}
