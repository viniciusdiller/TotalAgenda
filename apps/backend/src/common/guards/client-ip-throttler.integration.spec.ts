import "reflect-metadata";
import { Controller, HttpCode, INestApplication, Post } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { Throttle, ThrottlerModule } from "@nestjs/throttler";
import request from "supertest";
import { ClientIpThrottlerGuard } from "./client-ip-throttler.guard";
import {
  CLIENT_IP_HEADER,
  CLIENT_IP_SIG_HEADER,
  CLIENT_IP_TS_HEADER,
  signClientIp,
} from "../utils/client-ip-signature.util";

const SECRET = "0123456789abcdef0123456789abcdef";
const LIMIT = 3;

// Rota parecida com /auth/login: limite baixo por IP.
@Controller("t")
class LoginLikeController {
  @Throttle({ default: { limit: LIMIT, ttl: 60_000 } })
  @HttpCode(200)
  @Post("login")
  login() {
    return { ok: true };
  }
}

async function buildApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])],
    controllers: [LoginLikeController],
    providers: [{ provide: APP_GUARD, useClass: ClientIpThrottlerGuard }],
  }).compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

function signed(ip: string, secret = SECRET) {
  const ts = Date.now();
  return {
    [CLIENT_IP_HEADER]: ip,
    [CLIENT_IP_TS_HEADER]: String(ts),
    [CLIENT_IP_SIG_HEADER]: signClientIp(ip, ts, secret),
  };
}

async function hit(app: INestApplication, headers: Record<string, string> = {}) {
  const res = await request(app.getHttpServer()).post("/t/login").set(headers);
  return res.status;
}

describe("ClientIpThrottlerGuard (integração com ThrottlerModule real)", () => {
  const original = process.env.CLIENT_IP_SECRET;
  let app: INestApplication;

  afterEach(async () => {
    await app.close();
    if (original === undefined) delete process.env.CLIENT_IP_SECRET;
    else process.env.CLIENT_IP_SECRET = original;
  });

  // O bug original: TODAS as chamadas do servidor Next chegam do mesmo IP, então um visitante que
  // estoura o limite derruba o login de todos os outros.
  it("um visitante que estoura o limite NÃO bloqueia os outros (mesmo IP de conexão)", async () => {
    process.env.CLIENT_IP_SECRET = SECRET;
    app = await buildApp();

    for (let i = 0; i < LIMIT; i++) expect(await hit(app, signed("203.0.113.7"))).toBe(200);
    expect(await hit(app, signed("203.0.113.7"))).toBe(429);

    // Outro visitante, mesma conexão (servidor Next): segue liberado.
    expect(await hit(app, signed("198.51.100.9"))).toBe(200);
  });

  it("sem CLIENT_IP_SECRET mantém o comportamento antigo: um balde só, cabeçalhos ignorados", async () => {
    delete process.env.CLIENT_IP_SECRET;
    app = await buildApp();

    for (let i = 0; i < LIMIT; i++) expect(await hit(app, signed("203.0.113.7"))).toBe(200);
    expect(await hit(app, signed("198.51.100.9"))).toBe(429);
  });

  // Segurança: se o cabeçalho sem assinatura valesse, o atacante trocaria de IP a cada tentativa
  // e nunca cairia no limite.
  it("trocar de IP sem assinatura válida NÃO escapa do limite", async () => {
    process.env.CLIENT_IP_SECRET = SECRET;
    app = await buildApp();

    const statuses: number[] = [];
    for (let i = 0; i < LIMIT + 2; i++) statuses.push(await hit(app, { [CLIENT_IP_HEADER]: `198.51.100.${i + 1}` }));

    expect(statuses.slice(0, LIMIT)).toEqual(Array(LIMIT).fill(200));
    expect(statuses.slice(LIMIT)).toEqual([429, 429]);
  });

  it("assinatura feita com segredo errado NÃO escapa do limite", async () => {
    process.env.CLIENT_IP_SECRET = SECRET;
    app = await buildApp();

    const statuses: number[] = [];
    for (let i = 0; i < LIMIT + 1; i++) {
      statuses.push(await hit(app, signed(`198.51.100.${i + 1}`, "x".repeat(32))));
    }

    expect(statuses[LIMIT]).toBe(429);
  });
});
