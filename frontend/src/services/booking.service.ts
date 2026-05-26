import api from '@/lib/axios';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BookingClinicInfo {
  _id:     string;
  name:    string;
  slug:    string;
  type:    string;
  address: { line1: string; city: string; state: string; pincode: string };
  mobile:  string;
  email:   string;
  logoUrl?: string;
  settings: {
    workingDays:         number[];
    workingHours:        { start: string; end: string };
    appointmentDuration: number;
    timezone:            string;
  };
}

export interface BookingDoctor {
  _id:              string;
  name:             string;
  specialization?:  string;
  consultationFee?: number;
  qualifications?:  string[];
  bio?:             string;
  avatarUrl?:       string;
}

export interface BookingSlot {
  slotStart:           string;
  slotEnd:             string;
  available:           boolean;
  bookedCount:         number;
  maxPatientsPerSlot:  number;
  reason:              'past' | 'leave' | 'full' | null;
}

export interface BookingSlotResult {
  available: boolean;
  reason?:   'not_scheduled' | 'on_leave';
  slotDurationMinutes?: number;
  slots:     BookingSlot[];
}

export interface BookingPatientPayload {
  name:     string;
  mobile:   string;
  gender:   'male' | 'female' | 'other';
  dob?:     string;
  age?:     number;
  ageUnit?: 'years' | 'months' | 'days';
  email?:   string;
}

export interface BookingPayload {
  doctorId:       string;
  date:           string;
  slotStart:      string;
  visitType:      'new' | 'followup';
  chiefComplaint?: string;
  patient:        BookingPatientPayload;
}

export interface BookingConfirmation {
  appointment: {
    _id:           string;
    tokenDisplay:  string;
    date:          string;
    slotStart:     string;
    slotEnd:       string;
    doctorName:    string;
    clinicName:    string;
    clinicAddress: string;
  };
  patient: {
    name:      string;
    patientId: string;
    mobile:    string;
  };
}

type Wrap<T> = { success: boolean; data: T };

// ── API (all public — no auth header needed) ──────────────────────────────────

export const bookingApi = {
  getClinicInfo: (slug: string) =>
    api.get<Wrap<{ clinic: BookingClinicInfo; doctors: BookingDoctor[] }>>(`/booking/clinic/${slug}`),

  getSlots: (slug: string, doctorId: string, date: string) =>
    api.get<Wrap<BookingSlotResult>>(`/booking/clinic/${slug}/slots`, { params: { doctorId, date } }),

  createBooking: (slug: string, payload: BookingPayload) =>
    api.post<Wrap<BookingConfirmation>>(`/booking/clinic/${slug}/appointments`, payload),
};
