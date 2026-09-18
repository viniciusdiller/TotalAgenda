// Lockout progressivo por conta, além do rate limit por IP do ThrottlerGuard — um cobre
// "muitas tentativas de qualquer IP", o outro "muitas tentativas contra esta conta", inclusive
// de IPs diferentes (botnet). Compartilhado entre o login de staff e o de consumidor pra que a
// política não divirja silenciosamente entre os dois.
export const LOCKOUT_THRESHOLD = 5;
export const LOCKOUT_SCHEDULE_MINUTES = [1, 5, 15, 30, 60];

export function lockoutDurationMs(failedAttempts: number): number {
  const step = Math.min(failedAttempts - LOCKOUT_THRESHOLD, LOCKOUT_SCHEDULE_MINUTES.length - 1);
  return LOCKOUT_SCHEDULE_MINUTES[Math.max(step, 0)] * 60_000;
}
