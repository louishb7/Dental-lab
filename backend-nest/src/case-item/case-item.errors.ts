export class CaseItemCaseNotFoundError extends Error {
  constructor() {
    super('Caso não encontrado');
  }
}
