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

export interface CaseResponse {
  id: number;
  doctor_id: number;
  patient_ref: string;
  pricing_mode: string;
  deadline: Date | null;
  priority: string;
  status: string;
  total_value: Prisma.Decimal | null;
  notes: string | null;
  created_at: Date;
  delivered_at: Date | null;
  deleted_at: Date | null;
  status_revert_reason: string | null;
  items_count: number;
  items: CaseItemResponse[];
}
