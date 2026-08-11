import { PrismaClient, PlanTier } from "@prisma/client";

const prisma = new PrismaClient();

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

async function main() {
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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
