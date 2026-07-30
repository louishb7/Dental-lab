export interface DoctorResponse {
  id: number;
  name: string;
  clinic_name: string | null;
  phone: string | null;
  notes: string | null;
  created_at: Date;
  deleted_at: Date | null;
  cases_count: number;
}
