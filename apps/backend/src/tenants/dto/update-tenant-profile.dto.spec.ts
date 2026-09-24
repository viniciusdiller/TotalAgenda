import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { UpdateTenantProfileDto } from "./update-tenant-profile.dto";

const validate = (data: object) => validateSync(plainToInstance(UpdateTenantProfileDto, data)).length === 0;
const valid = (instagramUrl: string) => validate({ instagramUrl });

describe("UpdateTenantProfileDto.instagramUrl", () => {
  it("aceita só https no domínio do Instagram", () => {
    expect(valid("https://instagram.com/seu_negocio")).toBe(true);
    expect(valid("https://www.instagram.com/seu.negocio/")).toBe(true);
  });

  // Regressão: o valor vira href na página pública do salão — esquemas perigosos, URL sem
  // protocolo e QUALQUER outro domínio (phishing apresentado como "o Instagram do salão") não passam.
  it.each([
    "javascript:alert(1)",
    "javascript://x.com/%0aalert(1)",
    "data:text/html,<script>1</script>",
    "ftp://x.com/a",
    "instagram.com/x",
    "http://instagram.com/seu_negocio",
    "https://evil.com/instagram.com/x",
    "https://instagram.com.evil.com/x",
    "https://instagram.com@evil.com/x",
    "https://instagram.com/x y",
  ])("recusa %s", (value) => {
    expect(valid(value)).toBe(false);
  });

  it("vazio limpa o campo (não é erro de formato)", () => {
    expect(valid("")).toBe(true);
  });
});

describe("UpdateTenantProfileDto.whatsappNumber", () => {
  it("aceita número brasileiro com DDI", () => {
    expect(validate({ whatsappNumber: "5511912345678" })).toBe(true);
    expect(validate({ whatsappNumber: "551132345678" })).toBe(true);
    expect(validate({ whatsappNumber: "" })).toBe(true);
  });

  it.each(["11912345678", "5501912345678", "123", "+5511912345678", "551191234567890"])("recusa %s", (value) => {
    expect(validate({ whatsappNumber: value })).toBe(false);
  });
});
