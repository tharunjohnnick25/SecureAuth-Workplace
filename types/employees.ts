export type EmployeeStatus = 'Active' | 'Inactive' | 'Resigned' | 'On Leave' | 'Suspended' | 'Retired' | 'Terminated';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Intern' | 'Temporary';
export type Gender = 'Male' | 'Female' | 'Other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type DocumentType = 'Aadhaar' | 'PAN' | 'Passport' | 'Resume' | 'Offer Letter' | 'Experience Certificate' | 'Degree Certificate' | 'Driving License' | 'Other';

export interface Employee {
  id: string;
  employee_id?: string;
  email: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  department?: string;
  designation?: string;
  date_of_joining?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
  employment_type?: string;
  blood_group?: string;
  manager_id?: string;
  salary?: number;
  status: string;
  avatar_url?: string;
  role: string;
  created_at: string;
  updated_at?: string;
  manager_name?: string;
  leave_balance?: LeaveBalance[];
  attendance_summary?: AttendanceSummary;
}

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: string;
  document_name: string;
  file_url: string;
  file_size?: number;
  mime_type?: string;
  is_verified: boolean;
  created_at: string;
  updated_at?: string;
}

export interface LeaveBalance {
  id: string;
  employee_id: string;
  leave_type: string;
  total_days: number;
  used_days: number;
  pending_days: number;
  year: number;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  half_day: number;
  total: number;
}

export interface EmployeeFormData {
  employee_id?: string;
  email: string;
  full_name: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  department?: string;
  designation?: string;
  date_of_joining?: string;
  gender?: string;
  date_of_birth?: string;
  address?: string;
  emergency_contact?: string;
  employment_type?: string;
  blood_group?: string;
  manager_id?: string;
  salary?: number;
  status?: string;
}

export interface ImportResult {
  total: number;
  imported: number;
  skipped: number;
  errors: { row: number; message: string }[];
}
