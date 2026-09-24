// CPF: 11 dígitos, dois dígitos verificadores (módulo 11) e sem sequência repetida (000.000.000-00 etc.
// passam na conta mas nunca são emitidos). Valida forma e dígitos — não consulta a Receita.
export function normalizeCpf(raw: string): string {
  return raw.replace(/\D/g, "");
}

export function isValidCpf(raw: string): boolean {
  const cpf = normalizeCpf(raw);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
}
