import type { Prisma } from '@prisma/client';

export interface CaseItemResponse {
  id: number;
  case_id: number;
  tooth: string;
  service_type: string;
  quantity: number;
  unit_value: Prisma.Decimal | null;
  material: string | null;
  color: string | null;
  notes: string | null;
}
