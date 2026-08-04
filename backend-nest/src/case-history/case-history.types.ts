import type { Prisma } from '@prisma/client';

import type { CaseItemResponse, CaseResponse } from '../case/case.types';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
  has_next_page: boolean;
}

export interface CaseHistoryListItem {
  id: number;
  doctor_id: number;
  doctor_name: string;
  patient_ref: string;
  pricing_mode: string;
  status: string;
  total_value: Prisma.Decimal | null;
  created_at: Date;
  delivered_at: Date | null;
  deleted_at: Date | null;
  items_count: number;
  items_summary: string;
  has_reverted: boolean;
}

export interface CaseHistoryListResponse {
  items: CaseHistoryListItem[];
  pagination: PaginationMeta;
}

export interface CaseHistoryEventResponse {
  id: number;
  case_id: number;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  reason: string | null;
  created_at: Date;
}

export interface CaseHistoryEventsResponse {
  items: CaseHistoryEventResponse[];
  pagination: PaginationMeta;
}

export interface CaseHistoryDetailResponse extends CaseResponse {
  doctor_name: string;
  has_reverted: boolean;
  items: CaseItemResponse[];
}
