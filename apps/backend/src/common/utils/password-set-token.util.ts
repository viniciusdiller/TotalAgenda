import { createHash } from "crypto";

// Hash determinístico (não bcrypt): o token já tem alta entropia (32 bytes aleatórios), então
// não precisa de salt/custo — e precisamos consultar o usuário por hash, o que um bcrypt salgado
// não permite. Mesma ideia de hashing de "remember me"/reset tokens em outros frameworks.
export function hashPasswordSetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
