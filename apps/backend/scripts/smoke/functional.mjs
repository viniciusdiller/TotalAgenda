// Fluxos de negócio ponta a ponta, com os MESMOS formatos que o frontend envia (telefone/CPF mascarados,
// dinheiro em centavos vindo de moneyToCents, Instagram normalizado). Ver lib.mjs para como rodar.
import { LEGAL_VERSION, call, createChecker } from "./lib.mjs";

const { check, finish } = createChecker();
const stamp = Date.now();
const email = `dono${stamp}@e2e.com`;
const password = "senha-forte-123";

console.log("== cadastro e login");
let r = await call("POST", "/public/signup", { businessName: "  Salão E2E  ", ownerName: "Dona E2E", email: email.toUpperCase(), password, acceptedTermsVersion: LEGAL_VERSION });
check("signup 201", r.status === 201, r);
const slug = r.json?.slug;
r = await call("POST", "/auth/login", { email, password });
check("login (e-mail normalizado)", r.status === 200, r);
const T = r.json?.accessToken;
check("token emitido", !!T);

console.log("== serviços / profissionais / produtos");
r = await call("POST", "/services", { name: "  Corte  ", description: "  Corte simples ", durationMinutes: 30, priceCents: 4590 }, T);
check("cria serviço (nome aparado)", r.status === 201 && r.json?.name === "Corte", r);
const serviceId = r.json?.id;
r = await call("POST", "/services", { name: "X", durationMinutes: 30, priceCents: 100 }, T);
check("serviço com nome curto → 400 em pt-BR", r.status === 400 && /Nome deve ter no mínimo 2/.test(JSON.stringify(r.json)), r);
r = await call("POST", "/services", { name: "Ok", durationMinutes: 2000, priceCents: 100 }, T);
check("duração > 1440 → 400", r.status === 400, r);
r = await call("POST", "/professionals", { name: "Pro Um", email: `pro${stamp}@e2e.com`, initialPassword: "a".repeat(73) }, T);
check("senha inicial > 72 → 400", r.status === 400, r);
r = await call("POST", "/professionals", { name: "Pro Um", email: `PRO${stamp}@E2E.com`, initialPassword: "senha-pro-123" }, T);
check("cria profissional (planos vêm da migration; e-mail minúsculo)", r.status === 201, r);
const professionalId = r.json?.id;
r = await call("POST", "/products", { name: "Shampoo", priceCents: 3500, costCents: 1500, initialStock: 10 }, T);
check("cria produto", r.status === 201, r);

console.log("== clientes (máscaras chegam formatadas)");
r = await call("POST", "/clients", { name: "Ana Cliente", phone: "(11) 91234-5678", cpf: "529.982.247-25", email: "ana@e2e.com", birthDate: "1990-05-20", tags: ["vip", " retorno ", ""] }, T);
check("cria cliente com telefone/CPF formatados", r.status === 201, r);
check("telefone só com dígitos", r.json?.phone === "11912345678", r.json?.phone);
check("CPF só com dígitos", r.json?.cpf === "52998224725", r.json?.cpf);
check("tags aparadas e sem vazias", JSON.stringify(r.json?.tags) === JSON.stringify(["vip", "retorno"]), r.json?.tags);
const clientId = r.json?.id;
r = await call("POST", "/clients", { name: "Dup", phone: "+55 11 91234-5678" }, T);
check("mesmo telefone com +55 → 409 (normalização converge)", r.status === 409, r);
for (const [label, body] of [
  ["telefone impossível", { name: "Zé", phone: "(11) 11111-1111" }],
  ["CPF inválido", { name: "Zé", phone: "(21) 98765-4321", cpf: "111.111.111-11" }],
  ["nascimento futuro", { name: "Zé", phone: "(21) 98765-4321", birthDate: "2999-01-01" }],
  ["nome só com espaços", { name: "     ", phone: "(21) 98765-4321" }],
  ["tags demais", { name: "Zé", phone: "(21) 98765-4321", tags: Array.from({ length: 21 }, (_, i) => "t" + i) }],
]) {
  r = await call("POST", "/clients", body, T);
  check(`cliente ${label} → 400`, r.status === 400, r);
}
r = await call("PATCH", `/clients/${clientId}`, { cpf: null, email: null, birthDate: null, notes: null }, T);
check("PATCH limpa campos com null", r.status === 200 && r.json?.cpf === null && r.json?.email === null, r);
r = await call("GET", `/clients?search=${encodeURIComponent("(11) 9123")}`, undefined, T);
check("busca por telefone formatado", r.status === 200 && r.json.length === 1, r);

console.log("== caixa e financeiro");
r = await call("POST", "/cash-register/open", { openingFloatCents: 0 }, T);
check("abre caixa", r.status === 201, r);
r = await call("POST", "/cash-register/movements", { kind: "DEPOSIT", amountCents: 12345, note: "  troco " }, T);
check("suprimento R$ 123,45", r.status === 201, r);
r = await call("POST", "/cash-register/movements", { kind: "DEPOSIT", amountCents: 0 }, T);
check("movimento de R$ 0 → 400", r.status === 400, r);
r = await call("POST", "/cash-register/close", { closingCountedCents: 12345 }, T);
check("fecha caixa sem diferença", r.status === 201 && r.json?.differenceCents === 0, r);
r = await call("POST", "/finance/entries", { direction: "EXPENSE", description: "  Luz  ", amountCents: 25000, dueDate: "2030-01-10" }, T);
check("lança despesa", r.status === 201 && r.json?.description === "Luz", r);
r = await call("GET", "/finance/entries?direction=EXPENSE&status=PENDING", undefined, T);
check("lista despesas pendentes (query como DTO)", r.status === 200 && r.json.length === 1, r);
r = await call("GET", "/finance/entries?direction=XX", undefined, T);
check("filtro inválido → 400", r.status === 400 && /inválido/.test(JSON.stringify(r.json)), r);
check("fluxo de caixa", (await call("GET", "/finance/cash-flow?from=2030-01-01&to=2030-12-31&basis=due", undefined, T)).status === 200);
check("DRE", (await call("GET", "/finance/dre?from=2030-01-01&to=2030-12-31", undefined, T)).status === 200);

console.log("== comissão (alvo validado no tenant)");
r = await call("POST", "/commissions/rules", { professionalId, base: "SERVICE", targetId: serviceId, kind: "PERCENT", value: 30 }, T);
check("regra com serviço do próprio tenant", r.status === 201, r);
r = await call("POST", "/commissions/rules", { professionalId, base: "SERVICE", targetId: "3f2b8c1e-8a3d-4c55-9d5e-0a1b2c3d4e5f", kind: "PERCENT", value: 30 }, T);
check("serviço inexistente/de outro tenant → 404", r.status === 404, r);
r = await call("POST", "/commissions/rules", { professionalId, base: "ALL", kind: "FIXED", value: 1250 }, T);
check("regra fixa R$ 12,50", r.status === 201, r);
r = await call("POST", "/commissions/rules", { professionalId, base: "ALL", kind: "PERCENT", value: 101 }, T);
check("percentual > 100 → 400", r.status === 400, r);

console.log("== comanda");
r = await call("POST", "/tickets", { clientId }, T);
check("abre comanda", r.status === 201, r);
const ticketId = r.json?.id;
r = await call("POST", `/tickets/${ticketId}/items`, { kind: "SERVICE", serviceId, professionalId }, T);
check("item de serviço (preço do catálogo)", r.status === 201 && r.json?.subtotalCents === 4590, r.json?.subtotalCents ?? r);
r = await call("POST", `/tickets/${ticketId}/items`, { kind: "SERVICE", serviceId, unitPriceCents: 1 }, T);
check("preço do cliente em item de catálogo → 400", r.status === 400, r);
check("desconto R$ 5,00", (await call("PATCH", `/tickets/${ticketId}/discount`, { discountCents: 500 }, T)).status === 200);
check("desconto > subtotal → 400", (await call("PATCH", `/tickets/${ticketId}/discount`, { discountCents: 99999999 }, T)).status === 400);
r = await call("POST", `/tickets/${ticketId}/payments`, { method: "PIX", amountCents: 4090 }, T);
check("pagamento", r.status === 201, r);
r = await call("POST", `/tickets/${ticketId}/close`, {}, T);
check("fecha comanda", r.status === 201 && r.json?.status === "CLOSED", r);

console.log("== perfil público");
r = await call("PATCH", "/tenants/me", { whatsappNumber: "5511912345678", instagramUrl: "https://instagram.com/salaoe2e", description: "Bem-vindo", address: "Rua A, 1" }, T);
check("WhatsApp (DDI) e Instagram normalizado", r.status === 200 && r.json?.whatsappNumber === "5511912345678", r);
for (const [label, body] of [
  ["WhatsApp sem DDI", { whatsappNumber: "11912345678" }],
  ["Instagram de outro domínio", { instagramUrl: "https://evil.com/x" }],
  ["Instagram http", { instagramUrl: "http://instagram.com/x" }],
  ["cor inválida", { accentColor: "vermelho" }],
]) {
  check(`perfil ${label} → 400`, (await call("PATCH", "/tenants/me", body, T)).status === 400);
}
r = await call("PATCH", "/tenants/me", { description: "", whatsappNumber: "", instagramUrl: "" }, T);
check("campos em branco LIMPAM (null)", r.status === 200 && r.json?.description === null && r.json?.whatsappNumber === null && r.json?.instagramUrl === null, r.json);
check("página pública carrega", (await call("GET", `/public/tenants/${slug}`)).status === 200);
check("marketplace com coordenadas", (await call("PATCH", "/tenants/me/marketplace", { city: "  São Paulo ", latitude: -23.5505, longitude: -46.6333, priceRange: 2 }, T)).status === 200);
check("latitude fora da faixa → 400", (await call("PATCH", "/tenants/me/marketplace", { latitude: 95 }, T)).status === 400);

console.log("== fichas (intake)");
r = await call("POST", "/intake/forms", { name: "Anamnese", fields: [{ key: "1o_retorno", label: "Primeiro retorno", type: "text" }, { key: "alergias", label: "Alergias", type: "select", options: ["Sim", "Não"], required: true }] }, T);
check("ficha com chave começando por número", r.status === 201, r);
const formId = r.json?.id;
check("chave __proto__ → 400", (await call("POST", "/intake/forms", { name: "Ruim", fields: [{ key: "__proto__", label: "x", type: "text" }] }, T)).status === 400);
r = await call("POST", "/intake/responses", { formId, clientId, answers: { alergias: "Sim", "1o_retorno": "30 dias" } }, T);
check("resposta de ficha aceita", r.status === 201 && r.json?.answers?.alergias === "Sim", r);
check("chave constructor nas respostas → 400 (antes: 500)", (await call("POST", "/intake/responses", { formId, clientId, answers: { alergias: "Sim", constructor: "x" } }, T)).status === 400);
check("opção fora da lista → 400", (await call("POST", "/intake/responses", { formId, clientId, answers: { alergias: "Talvez" } }, T)).status === 400);

console.log("== fronteira / mensagens");
r = await call("POST", "/appointments", { professionalId: "1 OR 1=1", startAt: "2030-01-01T10:00:00Z", items: [{ serviceId: "x" }] }, T);
check("id não-UUID → 400 em pt-BR", r.status === 400 && !/must be/.test(JSON.stringify(r.json)), r);
r = await call("POST", "/services", { name: "a\u0000b", durationMinutes: 30, priceCents: 100 }, T);
check("byte NUL → 400", r.status === 400 && /inválidos/.test(JSON.stringify(r.json)), r);
r = await call("GET", "/clients");
check("sem token → 401 em pt-BR", r.status === 401 && /Entre novamente/.test(JSON.stringify(r.json)), r);
r = await call("GET", "/rota-que-nao-existe", undefined, T);
check("404 não ecoa a rota", r.status === 404 && !/rota-que-nao-existe/.test(JSON.stringify(r.json)), r);

console.log("== cliente final (consumer)");
const phone = "(21) 98765-" + String(stamp).slice(-4);
r = await call("POST", "/public/consumer/register", { name: "  Bia  ", phone, email: `Bia${stamp}@E2E.com`, password: "senha-bia-123", consent: true });
check("cadastro (telefone mascarado, e-mail com caixa)", r.status === 201, r);
check("login por e-mail minúsculo", [200, 201].includes((await call("POST", "/public/consumer/login", { identifier: `bia${stamp}@e2e.com`, password: "senha-bia-123" })).status));
check("login por telefone formatado", [200, 201].includes((await call("POST", "/public/consumer/login", { identifier: phone, password: "senha-bia-123" })).status));
check("cadastro com telefone lixo → 400", (await call("POST", "/public/consumer/register", { name: "Zé", phone: "00 00000-0000", email: "ze@e2e.com", password: "senha-ze-123", consent: true })).status === 400);

finish();
