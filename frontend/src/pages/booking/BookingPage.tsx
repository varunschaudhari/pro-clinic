import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  Calendar, Clock, User, ChevronRight, ChevronLeft,
  CheckCircle, Phone, Mail, MapPin, Stethoscope, IndianRupee,
} from 'lucide-react';
import { bookingApi } from '@/services/booking.service';
import type {
  BookingClinicInfo, BookingDoctor, BookingSlot,
  BookingConfirmation, BookingPatientPayload,
} from '@/services/booking.service';
import { Spinner } from '@/components/ui/Spinner';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { getErrorMessage } from '@/lib/utils';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function todayIST() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

function addDays(dateStr: string, n: number) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtDate(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function fmt12(hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr   = h % 12 || 12;
  return `${hr}:${String(m).padStart(2, '0')} ${ampm}`;
}

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
}

// ── Step indicators ───────────────────────────────────────────────────────────

const STEPS = ['Pick a Slot', 'Your Details', 'Confirmed!'];

function StepBar({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0 mb-8">
      {STEPS.map((label, i) => (
        <div key={i} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-colors ${
              i < step  ? 'bg-primary border-primary text-white'
              : i === step ? 'border-primary text-primary bg-white'
              : 'border-gray-200 text-gray-400 bg-white'
            }`}>
              {i < step ? <CheckCircle className="h-4 w-4" /> : i + 1}
            </div>
            <p className={`text-[10px] font-medium mt-1 whitespace-nowrap hidden sm:block ${i === step ? 'text-primary' : 'text-muted-foreground'}`}>
              {label}
            </p>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`flex-1 h-px mx-2 ${i < step ? 'bg-primary' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Clinic header ─────────────────────────────────────────────────────────────

function ClinicHeader({ clinic }: { clinic: BookingClinicInfo }) {
  return (
    <div className="bg-white border-b border-gray-100 px-4 py-4 mb-6">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <span className="text-white font-bold text-sm">{clinic.name[0]}</span>
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-foreground text-base leading-tight">{clinic.name}</h1>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-0.5">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{clinic.address.city}, {clinic.address.state}</span>
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{clinic.mobile}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Doctor + Date + Slot ──────────────────────────────────────────────

interface Step1Props {
  clinic:          BookingClinicInfo;
  doctors:         BookingDoctor[];
  selectedDoctor:  BookingDoctor | null;
  selectedDate:    string;
  selectedSlot:    BookingSlot | null;
  onDoctorSelect:  (d: BookingDoctor) => void;
  onDateChange:    (date: string) => void;
  onSlotSelect:    (slot: BookingSlot) => void;
  onNext:          () => void;
  slots:           BookingSlot[];
  slotsLoading:    boolean;
  slotsError:      string;
  clinicSlug:      string;
}

function Step1({
  clinic, doctors,
  selectedDoctor, selectedDate, selectedSlot,
  onDoctorSelect, onDateChange, onSlotSelect, onNext,
  slots, slotsLoading, slotsError,
}: Step1Props) {
  const today = todayIST();

  // Date navigation — show 7 days starting from today
  const dates = Array.from({ length: 14 }, (_, i) => addDays(today, i))
    .filter((d) => {
      const dow = new Date(d + 'T12:00:00').getDay();
      return clinic.settings.workingDays.includes(dow);
    })
    .slice(0, 7);

  const availableSlots = slots.filter((s) => s.available);

  return (
    <div className="space-y-6">
      {/* Doctor selection */}
      <div>
        <h2 className="text-sm font-semibold text-foreground mb-3">Choose a Doctor</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {doctors.map((d) => (
            <button
              key={d._id}
              onClick={() => onDoctorSelect(d)}
              className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                selectedDoctor?._id === d._id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40 hover:bg-accent/30'
              }`}
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                {getInitials(d.name)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{d.name}</p>
                {d.specialization && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Stethoscope className="h-3 w-3 shrink-0" />{d.specialization}
                  </p>
                )}
                {d.consultationFee && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <IndianRupee className="h-3 w-3 shrink-0" />{d.consultationFee} consultation
                  </p>
                )}
              </div>
              {selectedDoctor?._id === d._id && (
                <CheckCircle className="h-4 w-4 text-primary ml-auto shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>
      </div>

      {selectedDoctor && (
        <>
          {/* Date picker */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" /> Select Date
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dates.map((d) => {
                const dt  = new Date(d + 'T12:00:00');
                const dow = dt.getDay();
                const isSelected = d === selectedDate;
                return (
                  <button
                    key={d}
                    onClick={() => onDateChange(d)}
                    className={`flex flex-col items-center min-w-[56px] px-2 py-2.5 rounded-xl border text-center transition-colors shrink-0 ${
                      isSelected
                        ? 'border-primary bg-primary text-white'
                        : 'border-border hover:border-primary/40 hover:bg-accent/30'
                    }`}
                  >
                    <span className={`text-[10px] font-medium uppercase ${isSelected ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {DAY_NAMES[dow]}
                    </span>
                    <span className={`text-lg font-bold leading-tight ${isSelected ? 'text-white' : 'text-foreground'}`}>
                      {dt.getDate()}
                    </span>
                    <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-muted-foreground'}`}>
                      {dt.toLocaleString('en-IN', { month: 'short' })}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Slot grid */}
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" /> Available Slots
              {availableSlots.length > 0 && (
                <span className="text-xs font-normal text-muted-foreground">({availableSlots.length} available)</span>
              )}
            </h2>

            {slotsLoading && <div className="flex justify-center py-8"><Spinner /></div>}
            {slotsError   && <Alert variant="error">{slotsError}</Alert>}

            {!slotsLoading && !slotsError && slots.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No slots scheduled for this day.
              </p>
            )}

            {!slotsLoading && !slotsError && slots.length > 0 && availableSlots.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">
                All slots are booked for this day. Please try another date.
              </p>
            )}

            {!slotsLoading && availableSlots.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {slots.map((slot) => {
                  const isSelected = selectedSlot?.slotStart === slot.slotStart;
                  return (
                    <button
                      key={slot.slotStart}
                      disabled={!slot.available}
                      onClick={() => onSlotSelect(slot)}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary text-white'
                          : slot.available
                            ? 'border-border hover:border-primary/50 hover:bg-accent/30 text-foreground'
                            : 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {fmt12(slot.slotStart)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      <div className="flex justify-end pt-2">
        <Button
          onClick={onNext}
          disabled={!selectedDoctor || !selectedSlot}
        >
          Continue <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Step 2: Patient details ───────────────────────────────────────────────────

interface PatientForm extends BookingPatientPayload {
  chiefComplaint: string;
  visitType: 'new' | 'followup';
}

interface Step2Props {
  initial:  PatientForm;
  onBack:   () => void;
  onSubmit: (form: PatientForm) => void;
  loading:  boolean;
  error:    string;
  doctor:   BookingDoctor;
  date:     string;
  slot:     BookingSlot;
}

function Step2({ initial, onBack, onSubmit, loading, error, doctor, date, slot }: Step2Props) {
  const [form, setForm] = useState<PatientForm>(initial);
  const [errs, setErrs] = useState<Partial<Record<keyof PatientForm, string>>>({});

  const set = (key: keyof PatientForm) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const e: typeof errs = {};
    if (!form.name.trim())   e.name   = 'Required';
    if (!form.mobile || !/^[6-9]\d{9}$/.test(form.mobile)) e.mobile = 'Enter valid 10-digit mobile';
    if (!form.gender) e.gender = 'Required';
    if (!form.age && !form.dob) e.age = 'Enter age or date of birth';
    setErrs(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Summary bar */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
        <span className="flex items-center gap-1.5 text-foreground font-medium">
          <User className="h-3.5 w-3.5 text-primary" /> Dr. {doctor.name}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" /> {fmtDate(date)}
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> {fmt12(slot.slotStart)} – {fmt12(slot.slotEnd)}
        </span>
      </div>

      <h2 className="text-sm font-semibold text-foreground">Your Details</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2 space-y-1.5">
          <Label required>Full Name</Label>
          <Input value={form.name} onChange={set('name')} placeholder="As on ID proof" error={errs.name} />
          {errs.name && <p className="text-xs text-destructive">{errs.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label required>Mobile Number</Label>
          <Input
            value={form.mobile} onChange={set('mobile')}
            placeholder="10-digit mobile" maxLength={10}
            leftElement={<Phone className="h-4 w-4" />}
            error={errs.mobile}
          />
          {errs.mobile && <p className="text-xs text-destructive">{errs.mobile}</p>}
        </div>

        <div className="space-y-1.5">
          <Label required>Gender</Label>
          <select value={form.gender} onChange={set('gender')}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          {errs.gender && <p className="text-xs text-destructive">{errs.gender}</p>}
        </div>

        <div className="space-y-1.5">
          <Label>Date of Birth</Label>
          <Input type="date" value={form.dob ?? ''} onChange={set('dob')}
            max={new Date().toISOString().slice(0, 10)} />
        </div>

        <div className="space-y-1.5">
          <Label>Age (if DOB unknown)</Label>
          <Input type="number" min={0} max={150} value={form.age ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, age: e.target.value ? parseInt(e.target.value) : undefined }))}
            placeholder="e.g. 35" error={errs.age} />
          {errs.age && <p className="text-xs text-destructive">{errs.age}</p>}
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label>Email (optional)</Label>
          <Input type="email" value={form.email ?? ''}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="For appointment confirmation"
            leftElement={<Mail className="h-4 w-4" />} />
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label>Visit Type</Label>
          <div className="flex gap-3">
            {(['new', 'followup'] as const).map((vt) => (
              <label key={vt} className={`flex items-center gap-2 cursor-pointer rounded-lg border px-3 py-2 text-sm flex-1 transition-colors ${
                form.visitType === vt
                  ? 'border-primary bg-primary/5 text-primary font-medium'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}>
                <input type="radio" className="sr-only" checked={form.visitType === vt}
                  onChange={() => setForm((f) => ({ ...f, visitType: vt }))} />
                {vt === 'new' ? 'New Visit' : 'Follow-up'}
              </label>
            ))}
          </div>
        </div>

        <div className="sm:col-span-2 space-y-1.5">
          <Label>Chief Complaint (optional)</Label>
          <Input value={form.chiefComplaint}
            onChange={(e) => setForm((f) => ({ ...f, chiefComplaint: e.target.value }))}
            placeholder="e.g. Fever and cough for 3 days" />
        </div>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <div className="flex justify-between pt-2">
        <Button type="button" variant="outline" onClick={onBack} leftIcon={<ChevronLeft className="h-4 w-4" />}>
          Back
        </Button>
        <Button type="submit" isLoading={loading}>Confirm Booking</Button>
      </div>
    </form>
  );
}

// ── Step 3: Confirmation ──────────────────────────────────────────────────────

function Step3({ confirmation, onBookAgain }: { confirmation: BookingConfirmation; onBookAgain: () => void }) {
  const { appointment: appt, patient } = confirmation;
  return (
    <div className="text-center space-y-5">
      <div className="flex flex-col items-center gap-3">
        <div className="h-16 w-16 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle className="h-8 w-8 text-emerald-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">Booking Confirmed!</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Please arrive 10 minutes early</p>
        </div>
      </div>

      {/* Appointment card */}
      <div className="bg-gray-50 rounded-2xl p-5 text-left space-y-3 max-w-sm mx-auto">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Token</p>
          <p className="text-xl font-bold text-primary">{appt.tokenDisplay}</p>
        </div>
        <div className="border-t border-border pt-3 space-y-2.5 text-sm">
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-foreground">{patient.name}</p>
              <p className="text-xs text-muted-foreground">ID: {patient.patientId} · {patient.mobile}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Stethoscope className="h-4 w-4 shrink-0" />
            <span>Dr. {appt.doctorName}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{fmtDate(appt.date)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 shrink-0" />
            <span>{fmt12(appt.slotStart)} – {fmt12(appt.slotEnd)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{appt.clinicName}, {appt.clinicAddress}</span>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Screenshot this page for your reference. You can cancel by calling the clinic directly.
      </p>

      <Button variant="outline" onClick={onBookAgain}>Book Another Appointment</Button>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const EMPTY_PATIENT: import('@/services/booking.service').BookingPatientPayload & {
  chiefComplaint: string; visitType: 'new' | 'followup';
} = {
  name: '', mobile: '', gender: '' as 'male', dob: '', age: undefined, email: '',
  chiefComplaint: '', visitType: 'new',
};

export default function BookingPage() {
  const { clinicSlug } = useParams<{ clinicSlug: string }>();

  const [clinic,  setClinic]  = useState<BookingClinicInfo | null>(null);
  const [doctors, setDoctors] = useState<BookingDoctor[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [pageError,   setPageError]   = useState('');

  const [step,           setStep]           = useState(0);
  const [selectedDoctor, setSelectedDoctor] = useState<BookingDoctor | null>(null);
  const [selectedDate,   setSelectedDate]   = useState(todayIST());
  const [selectedSlot,   setSelectedSlot]   = useState<BookingSlot | null>(null);
  const [slots,          setSlots]          = useState<BookingSlot[]>([]);
  const [slotsLoading,   setSlotsLoading]   = useState(false);
  const [slotsError,     setSlotsError]     = useState('');

  const [patientForm, setPatientForm] = useState(EMPTY_PATIENT);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [confirmation, setConfirmation] = useState<BookingConfirmation | null>(null);

  // Load clinic info
  useEffect(() => {
    if (!clinicSlug) return;
    bookingApi.getClinicInfo(clinicSlug)
      .then((r) => {
        setClinic(r.data.data.clinic);
        setDoctors(r.data.data.doctors);
      })
      .catch((e) => setPageError(getErrorMessage(e)))
      .finally(() => setPageLoading(false));
  }, [clinicSlug]);

  // Fetch slots when doctor or date changes
  const fetchSlots = useCallback(() => {
    if (!clinicSlug || !selectedDoctor || !selectedDate) return;
    setSlotsLoading(true);
    setSlotsError('');
    setSelectedSlot(null);
    bookingApi.getSlots(clinicSlug, selectedDoctor._id, selectedDate)
      .then((r) => setSlots(r.data.data.slots))
      .catch((e) => setSlotsError(getErrorMessage(e)))
      .finally(() => setSlotsLoading(false));
  }, [clinicSlug, selectedDoctor, selectedDate]);

  useEffect(() => { if (selectedDoctor) fetchSlots(); }, [selectedDoctor, selectedDate]); // eslint-disable-line

  const handleDoctorSelect = (d: BookingDoctor) => {
    setSelectedDoctor(d);
    setSelectedSlot(null);
    setSlots([]);
  };

  const handleBooking = async (form: typeof patientForm) => {
    if (!clinicSlug || !selectedDoctor || !selectedSlot) return;
    setSubmitting(true);
    setSubmitError('');
    setPatientForm(form);
    try {
      const r = await bookingApi.createBooking(clinicSlug, {
        doctorId:       selectedDoctor._id,
        date:           selectedDate,
        slotStart:      selectedSlot.slotStart,
        visitType:      form.visitType,
        chiefComplaint: form.chiefComplaint || undefined,
        patient: {
          name:   form.name,
          mobile: form.mobile,
          gender: form.gender,
          dob:    form.dob  || undefined,
          age:    form.age,
          email:  form.email || undefined,
        },
      });
      setConfirmation(r.data.data);
      setStep(2);
    } catch (e) {
      setSubmitError(getErrorMessage(e));
    } finally {
      setSubmitting(false);
    }
  };

  const resetBooking = () => {
    setStep(0);
    setSelectedDoctor(null);
    setSelectedDate(todayIST());
    setSelectedSlot(null);
    setSlots([]);
    setPatientForm(EMPTY_PATIENT);
    setConfirmation(null);
    setSubmitError('');
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  if (pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Spinner size="lg" />
      </div>
    );
  }

  if (pageError || !clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white rounded-xl border border-border shadow-sm p-8 max-w-md w-full text-center">
          <p className="text-muted-foreground text-sm">{pageError || 'Clinic not found.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ClinicHeader clinic={clinic} />

      <div className="max-w-2xl mx-auto px-4 pb-12">
        <StepBar step={step} />

        <div className="bg-white rounded-2xl border border-border shadow-sm p-5 sm:p-7">
          {step === 0 && (
            <Step1
              clinic={clinic}
              doctors={doctors}
              selectedDoctor={selectedDoctor}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              onDoctorSelect={handleDoctorSelect}
              onDateChange={(d) => { setSelectedDate(d); setSelectedSlot(null); }}
              onSlotSelect={setSelectedSlot}
              onNext={() => setStep(1)}
              slots={slots}
              slotsLoading={slotsLoading}
              slotsError={slotsError}
              clinicSlug={clinicSlug ?? ''}
            />
          )}

          {step === 1 && selectedDoctor && selectedSlot && (
            <Step2
              initial={patientForm}
              onBack={() => setStep(0)}
              onSubmit={handleBooking}
              loading={submitting}
              error={submitError}
              doctor={selectedDoctor}
              date={selectedDate}
              slot={selectedSlot}
            />
          )}

          {step === 2 && confirmation && (
            <Step3 confirmation={confirmation} onBookAgain={resetBooking} />
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Powered by <span className="font-semibold text-primary">ClinixIndia</span>
        </p>
      </div>
    </div>
  );
}
