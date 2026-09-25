import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type BillingStatus,
  type BillingStatusResponse,
  type PlanInfo,
  bannerFor,
  canOpenPortal,
  daysUntil,
  formatBRL,
  formatDate,
  hasBillingAccess,
  isPlanInfo,
  planCardAction,
} from "./billing.ts";

const NOW = Date.parse("2026-09-24T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString();

const PRO: PlanInfo = { tier: "PROFISSIONAL", name: "Profissional", priceCents: 7990, maxProfessionals: 5 };

function billing(status: BillingStatus, extra: Partial<BillingStatusResponse> = {}): BillingStatusResponse {
  return { status, trialEndsAt: iso(10), subscription: null, ...extra };
}
const withSub = (status: BillingStatus, over: { cancelAtPeriodEnd?: boolean } = {}) =>
  billing(status, {
    subscription: { status, currentPeriodEnd: iso(20), cancelAtPeriodEnd: over.cancelAtPeriodEnd ?? false, plan: PRO },
  });

describe("hasBillingAccess (espelha o backend)", () => {
  it("libera teste, ativa e em atraso; bloqueia o resto", () => {
    const expected: Record<BillingStatus, boolean> = {
      TRIALING: true,
      ACTIVE: true,
      PAST_DUE: true,
      TRIAL_EXPIRED: false,
      CANCELED: false,
      INCOMPLETE: false,
      UNPAID: false,
    };
    for (const [status, access] of Object.entries(expected)) {
      assert.equal(hasBillingAccess(status as BillingStatus), access, status);
    }
  });
});

describe("bannerFor", () => {
  it("sem aviso para assinatura ativa e para teste com mais de 3 dias", () => {
    assert.equal(bannerFor(withSub("ACTIVE"), NOW), null);
    assert.equal(bannerFor(billing("TRIALING", { trialEndsAt: iso(4) }), NOW), null);
  });

  it("teste: 'termina em N dia(s)' nos 3 últimos dias e 'hoje' no último", () => {
    assert.equal(bannerFor(billing("TRIALING", { trialEndsAt: iso(3) }), NOW)?.message, "Seu período de teste termina em 3 dias.");
    assert.equal(bannerFor(billing("TRIALING", { trialEndsAt: iso(1) }), NOW)?.message, "Seu período de teste termina em 1 dia.");
    assert.equal(bannerFor(billing("TRIALING", { trialEndsAt: iso(0) }), NOW)?.message, "Seu período de teste termina hoje.");
    assert.equal(bannerFor(billing("TRIALING", { trialEndsAt: iso(2) }), NOW)?.tone, "warning");
  });

  it("cada estado bloqueado tem mensagem própria e tom de perigo, com chamada para agir", () => {
    const blocked: BillingStatus[] = ["TRIAL_EXPIRED", "CANCELED", "UNPAID", "INCOMPLETE"];
    const banners = blocked.map((status) => bannerFor(billing(status), NOW));
    for (const banner of banners) {
      assert.ok(banner);
      assert.equal(banner.tone, "danger");
      assert.ok(banner.ctaLabel.length > 0);
    }
    assert.equal(new Set(banners.map((b) => b?.message)).size, blocked.length);
    // Só o teste vencido fala em "teste": era o texto único que confundia quem cancelou.
    for (const status of ["CANCELED", "UNPAID", "INCOMPLETE"] as const) {
      assert.doesNotMatch(bannerFor(billing(status), NOW)?.message ?? "", /teste/i);
    }
  });

  it("em atraso é aviso (ainda tem acesso), não perigo", () => {
    const banner = bannerFor(withSub("PAST_DUE"), NOW);
    assert.equal(banner?.tone, "warning");
    assert.match(banner?.message ?? "", /Regularize/);
  });

  it("cancelamento agendado: avisa a data e diz que o acesso segue até lá", () => {
    const banner = bannerFor(withSub("ACTIVE", { cancelAtPeriodEnd: true }), NOW);
    assert.equal(banner?.tone, "warning");
    assert.match(banner?.message ?? "", /será encerrada em \d{2}\/\d{2}\/\d{4}/);
    assert.match(banner?.message ?? "", /mantém o acesso/);
  });
});

describe("planCardAction: o botão de cada plano", () => {
  it("sem assinatura viva todo card é 'assinar'", () => {
    for (const status of ["TRIALING", "TRIAL_EXPIRED", "CANCELED", "INCOMPLETE"] as const) {
      assert.equal(planCardAction(billing(status), "PREMIUM"), "SUBSCRIBE", status);
    }
  });

  it("assinatura ativa: o plano atual é 'current' e os outros são 'trocar'", () => {
    assert.equal(planCardAction(withSub("ACTIVE"), "PROFISSIONAL"), "CURRENT");
    assert.equal(planCardAction(withSub("ACTIVE"), "ESSENCIAL"), "CHANGE");
    assert.equal(planCardAction(withSub("ACTIVE"), "PREMIUM"), "CHANGE");
  });

  // O backend recusa novo checkout e troca com assinatura em atraso/não paga (evitaria cobrar em dobro).
  it("em atraso ou não paga só o portal resolve, em qualquer card", () => {
    for (const status of ["PAST_DUE", "UNPAID"] as const) {
      for (const tier of ["ESSENCIAL", "PROFISSIONAL", "PREMIUM"] as const) {
        assert.equal(planCardAction(withSub(status), tier), "MANAGE_PAYMENT");
      }
    }
  });

  it("o portal só existe para quem já tem assinatura", () => {
    assert.equal(canOpenPortal(billing("TRIALING")), false);
    assert.equal(canOpenPortal(withSub("ACTIVE")), true);
    assert.equal(canOpenPortal(withSub("CANCELED")), true);
  });
});

describe("formatação", () => {
  it("daysUntil arredonda para cima", () => {
    assert.equal(daysUntil(new Date(NOW + 1000).toISOString(), NOW), 1);
    assert.equal(daysUntil(new Date(NOW + 2 * DAY).toISOString(), NOW), 2);
    assert.equal(daysUntil(new Date(NOW - 1000).toISOString(), NOW), 0);
  });

  it("dinheiro em reais a partir de centavos", () => {
    assert.match(formatBRL(7990).replace(/\s/g, " "), /^R\$ 79,90$/);
    assert.match(formatBRL(149_90).replace(/\s/g, " "), /^R\$ 149,90$/);
  });

  it("data no fuso do Brasil (23h em SP não vira o dia seguinte)", () => {
    // 2026-10-09T02:30Z = 08/10 às 23:30 em São Paulo.
    assert.equal(formatDate("2026-10-09T02:30:00Z"), "08/10/2026");
  });
});

describe("isPlanInfo", () => {
  const ok = { tier: "PROFISSIONAL", name: "Profissional", priceCents: 7990, maxProfessionals: 5 };

  it("aceita a forma que GET /plans devolve (com e sem limite)", () => {
    assert.equal(isPlanInfo(ok), true);
    assert.equal(isPlanInfo({ ...ok, tier: "PREMIUM", maxProfessionals: null }), true);
  });

  // A resposta vem de fora do TypeScript: forma errada não pode chegar à tela como se fosse um plano.
  it("recusa tier desconhecido, preço inválido e limite incoerente", () => {
    for (const bad of [
      null, "x", 1, {}, { ...ok, tier: "GRATIS" }, { ...ok, name: 3 }, { ...ok, priceCents: -1 },
      { ...ok, priceCents: 79.9 }, { ...ok, priceCents: "7990" }, { ...ok, maxProfessionals: 0 },
      { ...ok, maxProfessionals: 2.5 }, { ...ok, maxProfessionals: undefined },
    ]) {
      assert.equal(isPlanInfo(bad), false, JSON.stringify(bad));
    }
  });
});
