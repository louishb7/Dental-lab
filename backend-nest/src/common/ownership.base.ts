export abstract class OwnershipBase {
  protected ownDoctor(doctorId: number, userId: number) {
    return { id: doctorId, userId, deletedAt: null };
  }

  protected ownDoctors(userId: number) {
    return { userId, deletedAt: null };
  }

  protected ownCase(caseId: number, userId: number) {
    return { id: caseId, userId, deletedAt: null };
  }

  protected ownCases(userId: number) {
    return { userId, deletedAt: null };
  }
}
