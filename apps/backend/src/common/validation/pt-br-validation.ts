import { BadRequestException } from "@nestjs/common";
import type { ValidationError } from "class-validator";

// O ValidationPipe padrão devolve as mensagens do class-validator em INGLÊS ("email must be an email"), e o
// frontend as mostra ao usuário como estão. Aqui elas viram frases em português, com o rótulo do campo.
// Não muda a forma da resposta ({ message: string[], error, statusCode }) nem o que é aceito — só o texto.
//
// Mensagens que o próprio DTO já escreveu em português (ex.: "Telefone inválido. Informe DDD e número.") são
// mantidas: só o que é o texto padrão em inglês do class-validator é traduzido.

const FIELD_LABELS: Record<string, string> = {
  name: "Nome",
  businessName: "Nome do negócio",
  ownerName: "Seu nome",
  email: "E-mail",
  password: "Senha",
  newPassword: "Nova senha",
  currentPassword: "Senha atual",
  initialPassword: "Senha inicial",
  identifier: "E-mail ou telefone",
  phone: "Telefone",
  clientPhone: "Telefone",
  clientName: "Nome do cliente",
  cpf: "CPF",
  birthDate: "Nascimento",
  notes: "Observações",
  tags: "Tags",
  description: "Descrição",
  address: "Endereço",
  businessHours: "Horário de funcionamento",
  city: "Cidade",
  neighborhood: "Bairro",
  latitude: "Latitude",
  longitude: "Longitude",
  priceCents: "Preço",
  costCents: "Custo",
  amountCents: "Valor",
  discountCents: "Desconto",
  unitPriceCents: "Valor unitário",
  openingFloatCents: "Fundo de troco",
  closingCountedCents: "Dinheiro contado",
  durationMinutes: "Duração",
  quantity: "Quantidade",
  initialStock: "Estoque inicial",
  startAt: "Início",
  endAt: "Término",
  dueDate: "Vencimento",
  paidAt: "Data de pagamento",
  from: "Data inicial",
  to: "Data final",
  date: "Data",
  rating: "Nota",
  comment: "Comentário",
  reason: "Motivo",
  note: "Observação",
  key: "Chave do campo",
  label: "Rótulo",
  options: "Opções",
  fields: "Campos",
  value: "Valor",
  sku: "SKU",
  bio: "Apresentação",
  accentColor: "Cor de destaque",
  whatsappNumber: "WhatsApp",
  instagramUrl: "Instagram",
  status: "Situação",
  kind: "Tipo",
  direction: "Tipo de lançamento",
  basis: "Base do cálculo",
  method: "Forma de pagamento",
  tier: "Plano",
  token: "Token",
};

const label = (property: string) => FIELD_LABELS[property] ?? "Campo";

// Trecho numérico da mensagem padrão ("must be longer than or equal to 2 characters" → 2).
const numberIn = (message: string) => /(-?\d+(?:\.\d+)?)/.exec(message)?.[1] ?? "";

const TRANSLATIONS: Record<string, (field: string, message: string) => string> = {
  isNotEmpty: (f) => `${f} é obrigatório.`,
  isDefined: (f) => `${f} é obrigatório.`,
  isString: (f) => `${f} inválido.`,
  isBoolean: (f) => `${f} inválido.`,
  isEnum: (f) => `${f} inválido.`,
  isIn: (f) => `${f} inválido.`,
  isObject: (f) => `${f} inválido.`,
  isUuid: (f) => `${f} inválido.`,
  isUrl: (f) => `${f} inválido.`,
  matches: (f) => `${f} inválido.`,
  isEmail: () => "E-mail inválido.",
  isInt: (f) => `${f} deve ser um número inteiro.`,
  isNumber: (f) => `${f} deve ser um número.`,
  isPositive: (f) => `${f} deve ser maior que zero.`,
  notEquals: (f) => `${f} não pode ser zero.`,
  isLatitude: () => "Latitude inválida.",
  isLongitude: () => "Longitude inválida.",
  isDateString: (f) => `${f} deve ser uma data válida.`,
  isISO8601: (f) => `${f} deve ser uma data válida.`,
  minLength: (f, m) => `${f} deve ter no mínimo ${numberIn(m)} caracteres.`,
  maxLength: (f, m) => `${f} deve ter no máximo ${numberIn(m)} caracteres.`,
  min: (f, m) => `${f} deve ser no mínimo ${numberIn(m)}.`,
  max: (f, m) => `${f} deve ser no máximo ${numberIn(m)}.`,
  isArray: (f) => `${f} inválido.`,
  arrayMinSize: (f, m) => `${f}: informe ao menos ${numberIn(m)} item(ns).`,
  arrayMaxSize: (f, m) => `${f}: no máximo ${numberIn(m)} itens.`,
  arrayUnique: (f) => `${f} não pode ter itens repetidos.`,
  whitelistValidation: (f) => `${f} não é permitido.`,
};

// Texto padrão do class-validator sempre está em inglês; mensagem própria do DTO (português) não.
const looksLikeDefaultEnglish = (message: string) =>
  /\b(must|should|has|have|is not|be a|be an|be one of)\b/i.test(message);

function collect(errors: ValidationError[], out: string[]) {
  for (const error of errors) {
    const field = label(error.property);
    for (const [constraint, message] of Object.entries(error.constraints ?? {})) {
      const translate = TRANSLATIONS[constraint];
      if (translate && looksLikeDefaultEnglish(message)) out.push(translate(field, message));
      else if (looksLikeDefaultEnglish(message)) out.push(`${field} inválido.`);
      else out.push(message);
    }
    if (error.children?.length) collect(error.children, out);
  }
}

export function translateValidationErrors(errors: ValidationError[]): string[] {
  const out: string[] = [];
  collect(errors, out);
  // Sem repetição ("Campo inválido." várias vezes vira uma), na ordem em que apareceram.
  return [...new Set(out)];
}

// exceptionFactory do ValidationPipe global.
export const validationExceptionFactory = (errors: ValidationError[]) =>
  new BadRequestException(translateValidationErrors(errors));
