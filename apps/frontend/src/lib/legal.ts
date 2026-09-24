// RASCUNHO dos documentos legais (Termos de Uso e Política de Privacidade).
//
// Enquanto LEGAL_DRAFT for true, as páginas mostram uma faixa "rascunho, não revisado
// juridicamente" e as lacunas ficam destacadas. Só marque como false DEPOIS de preencher todas as
// lacunas e de um advogado revisar o texto: o teste em legal.test.ts falha se LEGAL_DRAFT for false
// e ainda existir alguma lacuna. Ao mudar o texto, atualize também LEGAL_DOCS_VERSION
// (packages/shared-types), para todo mundo aceitar a nova versão no cadastro.
export const LEGAL_DRAFT = true;

// Lacunas: [PREENCHER: dado da empresa], [DECIDIR: decisão de negócio], [REVISAR: ponto jurídico].
const PLACEHOLDER = /\[(?:PREENCHER|DECIDIR|REVISAR)[^\]]*\]/;
const PLACEHOLDER_GLOBAL = new RegExp(PLACEHOLDER.source, "g");

export interface TextPart {
  text: string;
  placeholder: boolean;
}

export function hasPlaceholders(text: string): boolean {
  return PLACEHOLDER.test(text);
}

// Quebra o texto em pedaços comuns e lacunas, para a página destacar as lacunas.
export function splitPlaceholders(text: string): TextPart[] {
  const parts: TextPart[] = [];
  let last = 0;
  for (const match of text.matchAll(PLACEHOLDER_GLOBAL)) {
    const start = match.index ?? 0;
    if (start > last) parts.push({ text: text.slice(last, start), placeholder: false });
    parts.push({ text: match[0], placeholder: true });
    last = start + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), placeholder: false });
  return parts;
}
