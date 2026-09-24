import { Transform } from "class-transformer";

// E-mail de User é chave de login e único no banco (case-sensitive no Postgres). Sem normalizar,
// "Foo@x.com" e "foo@x.com" viram contas distintas — e quem cadastra a variante de caixa de um
// e-mail alheio escapa da checagem de "e-mail já existe". Sempre minúsculo e sem espaços nas
// bordas, no login e em toda criação/edição de User (o ValidationPipe global roda com
// `transform: true`, que é o que ativa este decorator).
export const NormalizeEmail = () =>
  Transform(({ value }) => (typeof value === "string" ? value.trim().toLowerCase() : value));
