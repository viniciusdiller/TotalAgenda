import "reflect-metadata";
import { plainToInstance } from "class-transformer";
import { validateSync } from "class-validator";
import { UpdateTenantProfileDto } from "./update-tenant-profile.dto";

const valid = (instagramUrl: string) =>
  validateSync(plainToInstance(UpdateTenantProfileDto, { instagramUrl })).length === 0;

describe("UpdateTenantProfileDto.instagramUrl", () => {
  it("aceita http(s) com protocolo explícito", () => {
    expect(valid("https://instagram.com/seu_negocio")).toBe(true);
    expect(valid("http://instagram.com/seu_negocio")).toBe(true);
  });

  // Regressão: o valor vira href na página pública do salão — esquemas perigosos e URL sem
  // protocolo não podem passar.
  it.each(["javascript:alert(1)", "javascript://x.com/%0aalert(1)", "data:text/html,<script>1</script>", "ftp://x.com/a", "instagram.com/x"])(
    "recusa %s",
    (value) => {
      expect(valid(value)).toBe(false);
    },
  );
});
