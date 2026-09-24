import { ClientIpThrottlerGuard } from "./client-ip-throttler.guard";
import {
  CLIENT_IP_HEADER,
  CLIENT_IP_SIG_HEADER,
  CLIENT_IP_TS_HEADER,
  signClientIp,
} from "../utils/client-ip-signature.util";

const SECRET = "0123456789abcdef0123456789abcdef";

// O guard só usa o método getTracker (sem estado), então dispensa montar as dependências do Nest.
function tracker(req: Record<string, unknown>): Promise<string> {
  const guard = Object.create(ClientIpThrottlerGuard.prototype) as ClientIpThrottlerGuard;
  return (guard as unknown as { getTracker(r: unknown): Promise<string> }).getTracker(req);
}

function signedHeaders(ip: string, ts = Date.now(), secret = SECRET) {
  return {
    [CLIENT_IP_HEADER]: ip,
    [CLIENT_IP_TS_HEADER]: String(ts),
    [CLIENT_IP_SIG_HEADER]: signClientIp(ip, ts, secret),
  };
}

describe("ClientIpThrottlerGuard.getTracker", () => {
  const original = process.env.CLIENT_IP_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.CLIENT_IP_SECRET;
    else process.env.CLIENT_IP_SECRET = original;
  });

  // Regressão do bug que motivou o guard: chamadas server-side do Next chegavam todas com o IP do
  // servidor Next, então o site inteiro dividia o mesmo balde de 10 logins/min.
  it("visitantes diferentes (IP assinado) têm baldes diferentes mesmo chegando pelo mesmo IP de conexão", async () => {
    process.env.CLIENT_IP_SECRET = SECRET;
    const viaNext = { ip: "10.0.0.5" }; // o servidor Next
    const a = await tracker({ ...viaNext, headers: signedHeaders("203.0.113.7") });
    const b = await tracker({ ...viaNext, headers: signedHeaders("198.51.100.9") });
    expect(a).toBe("203.0.113.7");
    expect(b).toBe("198.51.100.9");
    expect(a).not.toBe(b);
  });

  it("IP forjado SEM assinatura válida é ignorado (cai no IP da conexão)", async () => {
    process.env.CLIENT_IP_SECRET = SECRET;
    const forged = { [CLIENT_IP_HEADER]: "1.2.3.4" };
    expect(await tracker({ ip: "192.0.2.10", headers: forged })).toBe("192.0.2.10");
    const wrongSecret = signedHeaders("1.2.3.4", Date.now(), "x".repeat(32));
    expect(await tracker({ ip: "192.0.2.10", headers: wrongSecret })).toBe("192.0.2.10");
  });

  it("assinatura expirada é ignorada", async () => {
    process.env.CLIENT_IP_SECRET = SECRET;
    const old = signedHeaders("203.0.113.7", Date.now() - 5 * 60_000);
    expect(await tracker({ ip: "192.0.2.10", headers: old })).toBe("192.0.2.10");
  });

  it("sem CLIENT_IP_SECRET os cabeçalhos são ignorados por completo (falha segura)", async () => {
    delete process.env.CLIENT_IP_SECRET;
    const headers = signedHeaders("203.0.113.7");
    expect(await tracker({ ip: "192.0.2.10", headers })).toBe("192.0.2.10");
  });

  it("requisição sem cabeçalhos usa o IP da conexão (caminho direto do navegador)", async () => {
    process.env.CLIENT_IP_SECRET = SECRET;
    expect(await tracker({ ip: "192.0.2.10", headers: {} })).toBe("192.0.2.10");
    expect(await tracker({ ip: "192.0.2.10" })).toBe("192.0.2.10");
  });
});
