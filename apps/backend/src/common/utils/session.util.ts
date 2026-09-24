// Um token (acesso ou refresh) emitido ANTES da última troca de senha não vale mais. `iat` vem em
// segundos e `passwordChangedAt` em ms, então compara em segundos inteiros: um token emitido no mesmo
// segundo da troca (ex.: o que o próprio /auth/set-password devolve) continua válido. Token sem `iat`
// numa conta com senha trocada é tratado como revogado (fail closed).
export function isSessionRevoked(iatSeconds: number | undefined, passwordChangedAt: Date | null | undefined): boolean {
  if (!passwordChangedAt) return false;
  if (typeof iatSeconds !== "number") return true;
  return iatSeconds < Math.floor(passwordChangedAt.getTime() / 1000);
}
