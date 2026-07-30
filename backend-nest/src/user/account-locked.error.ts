export class AccountLockedError extends Error {
  constructor(readonly lockedUntil: Date) {
    super('Conta temporariamente bloqueada por tentativas inválidas');
  }
}
