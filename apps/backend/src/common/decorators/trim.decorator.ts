import { Transform } from "class-transformer";

// Formulários mandam "  Ana  " e "   " (só espaços). Sem trim ANTES da validação, "  " passa em
// @MinLength(2) e é gravado como nome vazio. Roda no ValidationPipe global (`transform: true`).
// Não usar em senha: espaço nas bordas de senha é legítimo e a senha nunca pode ser alterada em silêncio.
export const Trim = () =>
  Transform(({ value }) => (typeof value === "string" ? value.trim() : value));
