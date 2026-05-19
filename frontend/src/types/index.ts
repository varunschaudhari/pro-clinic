export type Role = 'SuperAdmin' | 'ClinicAdmin' | 'Doctor' | 'Receptionist' | 'Pharmacist';
export type Gender = 'male' | 'female' | 'other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown';

export interface AuthUser {
  id: string;
  name: string;
  role: Role;
  clinicId: string | null;
  mobile: string;
  email?: string;
  avatarUrl?: string;
  clinicName?: string | null;
  bio?: string;
  specialization?: string;
  licenseNumber?: string;
  consultationFee?: number;
  qualifications?: string[];
}

export interface Clinic {
  id: string;
  name: string;
  slug: string;
  type: string;
  mobile: string;
  email: string;
  logoUrl?: string;
  subscription: {
    plan: string;
    status: string;
    endDate: string;
  };
}

export interface Patient {
  id: string;
  clinicId: string;
  patientId: string;
  name: string;
  mobile: string;
  gender: Gender;
  dob?: string;
  age?: number;
  bloodGroup?: BloodGroup;
  visitCount: number;
  lastVisitDate?: string;
}

export interface Appointment {
  id: string;
  clinicId: string;
  patientId: string;
  doctorId: string;
  patient?: Patient;
  doctor?: AuthUser;
  appointmentDate: string;
  slotStart: string;
  tokenNumber: number;
  tokenDisplay: string;
  mode: 'walkin' | 'scheduled' | 'teleconsult';
  visitType: 'new' | 'followup';
  status: string;
  chiefComplaint?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiError {
  success: false;
  message: string;
  errors?: { field: string; message: string }[];
}
