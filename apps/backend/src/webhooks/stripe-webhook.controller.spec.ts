import "reflect-metadata";
import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import Stripe from "stripe";
import { IS_PUBLIC_KEY } from "../common/decorators/public.decorator";
import { StripeService } from "../billing/stripe.service";
import { StripeWebhookController } from "./stripe-webhook.controller";
import { StripeWebhookService } from "./stripe-webhook.service";

const SECRET = "whsec_segredo_de_teste_123";
// Cliente REAL do SDK (sem rede): a verificação de assinatura é a do Stripe de verdade, e
// generateTestHeaderString produz o cabeçalho que o Stripe mandaria.
const stripeSdk = new Stripe("sk_test_dummy");

// Com espaços e acentos de propósito: se o controller reserializasse o JSON em vez de usar os bytes
// crus, a assinatura deixaria de bater.
const PAYLOAD = `{
  "id": "evt_test_1",
  "object": "event",
  "type": "customer.subscription.updated",
  "data": { "object": { "id": "sub_1", "customer": "cus_1", "nota": "assinatura ação  com  espaços" } }
}`;

function signed(payload: string, secret = SECRET) {
  return stripeSdk.webhooks.generateTestHeaderString({ payload, secret });
}

// null = endpoint sem STRIPE_WEBHOOK_SECRET configurado (undefined acionaria o valor padrão do parâmetro).
async function buildApp(secret: string | null = SECRET) {
  const handle = jest.fn().mockResolvedValue(undefined);
  const moduleRef = await Test.createTestingModule({
    controllers: [StripeWebhookController],
    providers: [
      { provide: StripeWebhookService, useValue: { handle } },
      { provide: StripeService, useValue: { sdk: stripeSdk, webhookSecret: secret ?? undefined } },
    ],
  }).compile();
  const app: INestApplication = moduleRef.createNestApplication({ rawBody: true });
  await app.init();
  return { app, handle };
}

const post = (app: INestApplication, body: string, headers: Record<string, string> = {}) =>
  request(app.getHttpServer()).post("/webhooks/stripe").set("content-type", "application/json").set(headers).send(body);

describe("POST /webhooks/stripe: assinatura sobre o corpo CRU", () => {
  let app: INestApplication;
  afterEach(async () => app?.close());

  it("assinatura válida: 200 e o evento (já parseado) chega ao serviço", async () => {
    const built = await buildApp();
    app = built.app;

    const res = await post(app, PAYLOAD, { "stripe-signature": signed(PAYLOAD) });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ received: true });
    expect(built.handle).toHaveBeenCalledTimes(1);
    expect(built.handle.mock.calls[0][0]).toMatchObject({ id: "evt_test_1", type: "customer.subscription.updated" });
  });

  it.each([
    ["corpo alterado depois de assinar", (p: string) => p.replace("cus_1", "cus_2"), SECRET],
    ["assinado com outro segredo", (p: string) => p, "whsec_de_outro_endpoint"],
  ])("%s: 400 genérico e o serviço não é chamado", async (_label, mutate, secretUsedToSign) => {
    const built = await buildApp();
    app = built.app;
    const header = signed(PAYLOAD, secretUsedToSign);

    const res = await post(app, mutate(PAYLOAD), { "stripe-signature": header });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("Assinatura inválida.");
    expect(built.handle).not.toHaveBeenCalled();
  });

  it("sem o cabeçalho Stripe-Signature: 400", async () => {
    const built = await buildApp();
    app = built.app;

    const res = await post(app, PAYLOAD);

    expect(res.status).toBe(400);
    expect(built.handle).not.toHaveBeenCalled();
  });

  it("cabeçalho de assinatura lixo: 400 sem lançar 500", async () => {
    const built = await buildApp();
    app = built.app;

    const res = await post(app, PAYLOAD, { "stripe-signature": "t=abc,v1=zzz" });

    expect(res.status).toBe(400);
    expect(built.handle).not.toHaveBeenCalled();
  });

  it("assinatura antiga demais (replay) é recusada", async () => {
    const built = await buildApp();
    app = built.app;
    const timestamp = Math.floor(Date.now() / 1000) - 3600; // 1h atrás; a tolerância do Stripe é 5 min
    const header = stripeSdk.webhooks.generateTestHeaderString({ payload: PAYLOAD, secret: SECRET, timestamp });

    const res = await post(app, PAYLOAD, { "stripe-signature": header });

    expect(res.status).toBe(400);
    expect(built.handle).not.toHaveBeenCalled();
  });

  // Sem segredo não há como verificar: recusar (503, o Stripe reenvia) e nunca aceitar sem checar.
  it("sem STRIPE_WEBHOOK_SECRET configurado: 503 e nada é processado", async () => {
    const built = await buildApp(null);
    app = built.app;

    const res = await post(app, PAYLOAD, { "stripe-signature": signed(PAYLOAD) });

    expect(res.status).toBe(503);
    expect(built.handle).not.toHaveBeenCalled();
  });

  it("falha do serviço vira 500 (o Stripe reentrega o evento)", async () => {
    const built = await buildApp();
    app = built.app;
    built.handle.mockRejectedValue(new Error("banco fora"));

    const res = await post(app, PAYLOAD, { "stripe-signature": signed(PAYLOAD) });

    expect(res.status).toBe(500);
  });

  it("a rota é pública (sem JWT) e fora do limite por IP", () => {
    const handler = StripeWebhookController.prototype.handle;
    expect(Reflect.getMetadata(IS_PUBLIC_KEY, handler)).toBe(true);
    expect(Reflect.getMetadataKeys(handler).some((k: string) => k.startsWith("THROTTLER:SKIP"))).toBe(true);
  });
});
