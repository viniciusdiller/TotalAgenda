import { randomBytes } from "crypto";
import {
  AppointmentStatus,
  PlanTier,
  PrismaClient,
  Role,
  SubscriptionStatus,
  Weekday,
} from "@prisma/client";
import * as bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Senha única de todos os usuários semeados — só para ambiente local/testes.
const SEED_PASSWORD = "senha123";
const BCRYPT_ROUNDS = 12;

const plans: Array<{
  tier: PlanTier;
  name: string;
  priceCents: number;
  maxProfessionals: number | null;
  stripePriceId: string;
}> = [
  {
    tier: PlanTier.ESSENCIAL,
    name: "Essencial",
    priceCents: 2990,
    maxProfessionals: 2,
    stripePriceId: process.env.STRIPE_PRICE_ESSENCIAL ?? "price_essencial_placeholder",
  },
  {
    tier: PlanTier.PROFISSIONAL,
    name: "Profissional",
    priceCents: 7990,
    maxProfessionals: 5,
    stripePriceId: process.env.STRIPE_PRICE_PROFISSIONAL ?? "price_profissional_placeholder",
  },
  {
    tier: PlanTier.PREMIUM,
    name: "Premium",
    priceCents: 14990,
    maxProfessionals: null,
    stripePriceId: process.env.STRIPE_PRICE_PREMIUM ?? "price_premium_placeholder",
  },
];

const WEEKDAYS_MON_TO_FRI: Weekday[] = [
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
];

function atHour(base: Date, dayOffset: number, hour: number, minute = 0): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d;
}

async function seedPlans() {
  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      update: {
        name: plan.name,
        priceCents: plan.priceCents,
        maxProfessionals: plan.maxProfessionals,
        stripePriceId: plan.stripePriceId,
      },
      create: plan,
    });
  }
}

async function resetDemoTenant(slug: string) {
  // Idempotente. AppointmentItem.serviceId é onDelete: Restrict, então o cascade do
  // tenant sozinho não consegue apagar Service enquanto houver itens — removemos os
  // atendimentos (cascade nos itens) antes de dropar o tenant.
  const existing = await prisma.tenant.findUnique({ where: { slug }, select: { id: true } });
  if (!existing) return;
  const where = { tenantId: existing.id };
  // Ordem importa: várias FKs são onDelete: Restrict (StockMovement->Product,
  // CommissionEntry->Professional, Ticket->User, AppointmentItem->Service), então o
  // cascade do tenant sozinho não resolve.
  await prisma.financialEntry.deleteMany({ where }); // createdBy -> User (Restrict)
  await prisma.stockMovement.deleteMany({ where });
  await prisma.commissionEntry.deleteMany({ where });
  await prisma.payment.deleteMany({ where });
  await prisma.ticket.deleteMany({ where });
  await prisma.appointment.deleteMany({ where });
  await prisma.tenant.delete({ where: { id: existing.id } });
}

async function seedDemoTenant() {
  const slug = "salao-demo";
  await resetDemoTenant(slug);

  const passwordHash = await bcrypt.hash(SEED_PASSWORD, BCRYPT_ROUNDS);
  const now = new Date();

  const tenant = await prisma.tenant.create({
    data: {
      name: "Salão Demo",
      slug,
      trialEndsAt: atHour(now, 30, 23, 59),
      description: "Salão de demonstração com dados de teste.",
      address: "Rua das Flores, 123 - Centro",
      businessHours: "Seg-Sex 9h-19h",
      whatsappNumber: "5511999990000",
    },
  });

  const profissionalPlan = await prisma.plan.findUniqueOrThrow({
    where: { tier: PlanTier.PROFISSIONAL },
  });
  await prisma.subscription.create({
    data: {
      tenantId: tenant.id,
      planId: profissionalPlan.id,
      stripeCustomerId: `cus_demo_${randomBytes(6).toString("hex")}`,
      stripeSubscriptionId: `sub_demo_${randomBytes(6).toString("hex")}`,
      status: SubscriptionStatus.ACTIVE,
      currentPeriodEnd: atHour(now, 30, 12),
    },
  });

  const owner = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "dono@salaodemo.com",
      passwordHash,
      name: "Dona Marta",
      role: Role.OWNER,
    },
  });

  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: "recepcao@salaodemo.com",
      passwordHash,
      name: "Rita Recepção",
      role: Role.RECEPTIONIST,
    },
  });

  const professionalsData = [
    { name: "Alex Barbeiro", email: "alex@salaodemo.com" },
    { name: "Bruna Cabeleireira", email: "bruna@salaodemo.com" },
  ];

  const professionals = [] as Array<{ id: string; name: string }>;
  for (const p of professionalsData) {
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        email: p.email,
        passwordHash,
        name: p.name,
        role: Role.PROFESSIONAL,
      },
    });
    const professional = await prisma.professional.create({
      data: {
        tenantId: tenant.id,
        userId: user.id,
        bio: `${p.name} — profissional do Salão Demo.`,
        workingHours: {
          create: WEEKDAYS_MON_TO_FRI.map((weekday) => ({
            weekday,
            startMinute: 9 * 60,
            endMinute: 19 * 60,
          })),
        },
      },
    });
    professionals.push({ id: professional.id, name: p.name });
  }

  const servicesData = [
    { name: "Corte masculino", durationMinutes: 30, priceCents: 5000 },
    { name: "Corte feminino", durationMinutes: 60, priceCents: 9000 },
    { name: "Barba", durationMinutes: 30, priceCents: 3500 },
    { name: "Coloração", durationMinutes: 90, priceCents: 18000 },
  ];

  const services = [] as Array<{ id: string; durationMinutes: number; priceCents: number }>;
  for (const s of servicesData) {
    const service = await prisma.service.create({ data: { tenantId: tenant.id, ...s } });
    services.push({ id: service.id, durationMinutes: s.durationMinutes, priceCents: s.priceCents });
    // Todo profissional atende todo serviço (dados de teste).
    for (const professional of professionals) {
      await prisma.professionalService.create({
        data: { professionalId: professional.id, serviceId: service.id },
      });
    }
  }

  const clientsData = [
    {
      name: "João Cliente",
      phone: "11988887777",
      email: "joao@example.com",
      tags: ["VIP"],
      notes: "Prefere horário da manhã.",
      birthDate: new Date("1990-05-12"),
    },
    { name: "Maria Cliente", phone: "11977776666", tags: ["coloração"] },
    { name: "Pedro Cliente", phone: "11966665555" },
  ];
  const clients = [] as Array<{ id: string; name: string; phone: string }>;
  for (const c of clientsData) {
    const client = await prisma.client.create({ data: { tenantId: tenant.id, ...c } });
    clients.push(client);
  }

  const intakeForm = await prisma.intakeForm.create({
    data: {
      tenantId: tenant.id,
      name: "Anamnese capilar",
      fields: [
        { key: "alergias", label: "Alergias conhecidas", type: "textarea", required: true },
        { key: "quimica_recente", label: "Fez química nos últimos 30 dias?", type: "boolean" },
        {
          key: "tipo_cabelo",
          label: "Tipo de cabelo",
          type: "select",
          options: ["Liso", "Ondulado", "Cacheado", "Crespo"],
        },
      ],
    },
  });

  await prisma.intakeResponse.create({
    data: {
      tenantId: tenant.id,
      formId: intakeForm.id,
      clientId: clients[0].id,
      answers: { alergias: "Nenhuma", quimica_recente: false, tipo_cabelo: "Ondulado" },
    },
  });

  // Produtos + estoque inicial (M3).
  const productsData = [
    { name: "Pomada modeladora", priceCents: 4500, costCents: 2000, stock: 20 },
    { name: "Shampoo profissional 300ml", priceCents: 6900, costCents: 3500, stock: 12 },
  ];
  for (const p of productsData) {
    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name: p.name,
        priceCents: p.priceCents,
        costCents: p.costCents,
      },
    });
    await prisma.stockMovement.create({
      data: {
        tenantId: tenant.id,
        productId: product.id,
        kind: "IN",
        quantity: p.stock,
        note: "Estoque inicial",
      },
    });
  }

  // Regra de comissão: 30% em qualquer serviço para o primeiro profissional.
  await prisma.commissionRule.create({
    data: {
      tenantId: tenant.id,
      professionalId: professionals[0].id,
      base: "SERVICE",
      kind: "PERCENT",
      value: 30,
    },
  });

  // Financeiro (M4): categorias padrão + algumas despesas do mês.
  await prisma.financialCategory.createMany({
    data: [
      { tenantId: tenant.id, name: "Vendas de serviços", direction: "INCOME" },
      { tenantId: tenant.id, name: "Vendas de produtos", direction: "INCOME" },
      { tenantId: tenant.id, name: "Comissões", direction: "EXPENSE" },
      { tenantId: tenant.id, name: "Aluguel", direction: "EXPENSE" },
      { tenantId: tenant.id, name: "Fornecedores / produtos", direction: "EXPENSE" },
    ],
  });
  const aluguel = await prisma.financialCategory.findFirst({
    where: { tenantId: tenant.id, name: "Aluguel" },
  });
  await prisma.financialEntry.create({
    data: {
      tenantId: tenant.id,
      direction: "EXPENSE",
      source: "MANUAL",
      status: "PAID",
      description: "Aluguel do salão",
      amountCents: 250000,
      categoryId: aluguel!.id,
      counterparty: "Imobiliária Centro",
      dueDate: atHour(now, -5, 0),
      paidAt: atHour(now, -5, 10),
      createdByUserId: owner.id,
    },
  });
  await prisma.financialEntry.create({
    data: {
      tenantId: tenant.id,
      direction: "EXPENSE",
      source: "MANUAL",
      description: "Reposição de produtos",
      amountCents: 68000,
      counterparty: "Distribuidora Bella",
      dueDate: atHour(now, 7, 0),
      createdByUserId: owner.id,
    },
  });

  // Atendimentos: alguns futuros (CONFIRMED), um pendente (SCHEDULED via recepção), um
  // concluído e um cancelado — cobre a variedade de status para testar telas.
  const plan: Array<{
    dayOffset: number;
    hour: number;
    professionalIdx: number;
    serviceIdx: number;
    clientIdx: number;
    status: AppointmentStatus;
    source: "PUBLIC" | "STAFF";
  }> = [
    { dayOffset: 1, hour: 10, professionalIdx: 0, serviceIdx: 0, clientIdx: 0, status: AppointmentStatus.CONFIRMED, source: "PUBLIC" },
    { dayOffset: 1, hour: 14, professionalIdx: 1, serviceIdx: 1, clientIdx: 1, status: AppointmentStatus.CONFIRMED, source: "PUBLIC" },
    { dayOffset: 2, hour: 11, professionalIdx: 0, serviceIdx: 2, clientIdx: 2, status: AppointmentStatus.SCHEDULED, source: "STAFF" },
    { dayOffset: -3, hour: 15, professionalIdx: 1, serviceIdx: 3, clientIdx: 0, status: AppointmentStatus.COMPLETED, source: "PUBLIC" },
    { dayOffset: -1, hour: 9, professionalIdx: 0, serviceIdx: 0, clientIdx: 1, status: AppointmentStatus.CANCELED, source: "PUBLIC" },
  ];

  for (const item of plan) {
    const professional = professionals[item.professionalIdx];
    const service = services[item.serviceIdx];
    const client = clients[item.clientIdx];
    const startAt = atHour(now, item.dayOffset, item.hour);
    const endAt = new Date(startAt.getTime() + service.durationMinutes * 60_000);

    await prisma.appointment.create({
      data: {
        tenantId: tenant.id,
        professionalId: professional.id,
        clientName: client.name,
        clientPhone: client.phone,
        clientId: client.id,
        startAt,
        endAt,
        status: item.status,
        source: item.source,
        canceledAt: item.status === AppointmentStatus.CANCELED ? now : null,
        manageToken: randomBytes(16).toString("hex"),
        items: {
          create: {
            serviceId: service.id,
            position: 0,
            durationMinutes: service.durationMinutes,
            priceCentsSnapshot: service.priceCents,
          },
        },
      },
    });
  }

  return { tenant, owner };
}

async function main() {
  await seedPlans();
  const { tenant } = await seedDemoTenant();
  console.log(`Seed concluído.`);
  console.log(`  Tenant demo: /${tenant.slug}`);
  console.log(`  Login dono:      dono@salaodemo.com / ${SEED_PASSWORD}`);
  console.log(`  Login recepção:  recepcao@salaodemo.com / ${SEED_PASSWORD}`);
  console.log(`  Login profissional: alex@salaodemo.com / ${SEED_PASSWORD}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
