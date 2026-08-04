import type { Prisma } from '@prisma/client';

export interface DashboardCaseResponse {
  id: number;
  doctor_id: number;
  doctor_name: string;
  patient_ref: string;
  deadline: Date | null;
  priority: string;
  status: string;
  total_value: Prisma.Decimal | null;
  created_at: Date;
  delivered_at: Date | null;
  items_count: number;
}

export interface DashboardRevenueTrendItem {
  month: string;
  total_value: Prisma.Decimal;
  delivered_count: number;
}

export interface DashboardSummaryResponse {
  generated_at: Date;
  status_counts: Record<string, number>;
  overdue_cases: DashboardCaseResponse[];
  urgent_open_cases: DashboardCaseResponse[];
  delivered_cases_month: DashboardCaseResponse[];
  delivered_total_month: Prisma.Decimal;
  delivered_count_month: number;
  revenue_trend: DashboardRevenueTrendItem[];
}
