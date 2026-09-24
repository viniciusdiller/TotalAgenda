// Destino de redirecionamento pós-login (`?next=`): só caminho relativo do próprio site.
//
// O navegador NORMALIZA a URL antes de navegar: remove tab/quebra de linha ("/\t/evil.com" vira
// "//evil.com") e trata "\" como "/" ("/\evil.com" vira "//evil.com"). Ambos viram URL absoluta para
// outro host — sem esta checagem o login seria um open redirect para phishing. Por isso a regra é
// uma allowlist do que é aceito, não uma lista dos truques conhecidos.
export function isSafeRedirectPath(next: string | undefined | null): next is string {
  if (!next || next.length > 2000) return false;
  // Começa com uma única "/", seguida de algo que não seja "/" nem "\"; só caracteres visíveis (sem
  // espaço, tab, quebra de linha ou controle) e sem "\" em lugar nenhum.
  return /^\/(?![/\\])[^\s\\\u0000-\u001f\u007f]*$/.test(next) || next === "/";
}
