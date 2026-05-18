import { FREQ_DISPLAY } from '@/constants/prescription';
import type { PrescriptionItem } from '@/services/prescription.service';
import type { ClinicPrintInfo } from '@/services/clinic.service';
import { ClinicPrintHeader, ClinicPrintFooter } from '@/components/print/ClinicPrintHeader';

interface PrescriptionPrintViewProps {
  rx: PrescriptionItem;
  clinic?: ClinicPrintInfo | null;
}

const formatDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const calcAge = (patient: PrescriptionItem['patient']) => {
  if (patient.age) return `${patient.age} ${patient.ageUnit ?? 'yrs'}`;
  if (patient.dob) {
    const years = Math.floor(
      (Date.now() - new Date(patient.dob).getTime()) / (365.25 * 24 * 3600 * 1000)
    );
    return `${years} yrs`;
  }
  return '—';
};

export const PrescriptionPrintView = ({ rx, clinic }: PrescriptionPrintViewProps) => {
  const patient = rx.patient;
  const doctor  = rx.doctor;

  return (
    <div className="bg-white text-gray-900 font-sans text-sm print:text-xs" id="rx-print-area">
      <ClinicPrintHeader
        clinic={clinic}
        rightSlot={
          <>
            <p className="text-sm font-bold text-gray-700 mb-0.5">Medical Prescription</p>
            <p>Rx No: <span className="font-semibold">{rx.prescriptionNumber}</span></p>
            <p>Date: {formatDate(rx.createdAt)}</p>
            {doctor && <p>Dr. {doctor.name}</p>}
          </>
        }
      />

      {/* ── Patient info ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-1 mb-4 text-xs border border-gray-200 rounded p-3 bg-gray-50">
        <div><span className="text-gray-500">Name: </span><span className="font-medium">{patient.name}</span></div>
        <div><span className="text-gray-500">Age / Sex: </span><span className="font-medium">{calcAge(patient)} / {patient.gender.charAt(0).toUpperCase()}</span></div>
        <div><span className="text-gray-500">Mobile: </span><span className="font-medium">{patient.mobile}</span></div>
        <div><span className="text-gray-500">Patient ID: </span><span className="font-medium">{patient.patientId}</span></div>
        <div className="col-span-2">
          <span className="text-gray-500">Diagnosis: </span>
          <span className="font-medium">{rx.diagnosis.join(', ')}</span>
        </div>
      </div>

      {/* ── Medicines ─────────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <h2 className="font-bold text-base mb-2 flex items-center gap-1">
          <span className="text-2xl font-serif italic mr-1">℞</span> Medicines
        </h2>
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100 border-t border-b border-gray-300">
              <th className="text-left py-1 px-2 w-6">#</th>
              <th className="text-left py-1 px-2">Medicine</th>
              <th className="text-left py-1 px-2 w-16">Dosage</th>
              <th className="text-left py-1 px-2 w-32">Frequency</th>
              <th className="text-left py-1 px-2 w-20">Duration</th>
              <th className="text-left py-1 px-2 w-12">Qty</th>
              <th className="text-left py-1 px-2">Instructions</th>
            </tr>
          </thead>
          <tbody>
            {rx.medicines.map((med, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1.5 px-2 text-gray-500">{i + 1}</td>
                <td className="py-1.5 px-2">
                  <span className="font-semibold">{med.name}</span>
                  {med.genericName && (
                    <span className="text-gray-500 ml-1">({med.genericName})</span>
                  )}
                </td>
                <td className="py-1.5 px-2">{med.dosage}</td>
                <td className="py-1.5 px-2">{FREQ_DISPLAY[med.frequency] ?? med.frequency}</td>
                <td className="py-1.5 px-2">{med.duration}</td>
                <td className="py-1.5 px-2">{med.quantity ?? '—'}</td>
                <td className="py-1.5 px-2 text-gray-600">{med.instructions ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Lab tests ─────────────────────────────────────────────────────────── */}
      {rx.labTests.length > 0 && (
        <div className="mb-4">
          <h2 className="font-bold text-sm mb-2">Lab Investigations</h2>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            {rx.labTests.map((t, i) => (
              <li key={i}>
                {t.name}
                {t.urgency !== 'routine' && (
                  <span className="ml-1 text-red-600 font-semibold uppercase">({t.urgency})</span>
                )}
                {t.notes && <span className="text-gray-500 ml-1">— {t.notes}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Procedures ────────────────────────────────────────────────────────── */}
      {rx.procedures.length > 0 && (
        <div className="mb-4">
          <h2 className="font-bold text-sm mb-2">Procedures</h2>
          <ul className="list-disc list-inside space-y-0.5 text-xs">
            {rx.procedures.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </div>
      )}

      {/* ── Advice ────────────────────────────────────────────────────────────── */}
      {(rx.advice || rx.dietAdvice) && (
        <div className="mb-4 grid grid-cols-2 gap-4 text-xs">
          {rx.advice && (
            <div>
              <h2 className="font-bold text-sm mb-1">General Advice</h2>
              <p className="text-gray-700 whitespace-pre-line">{rx.advice}</p>
            </div>
          )}
          {rx.dietAdvice && (
            <div>
              <h2 className="font-bold text-sm mb-1">Diet Advice</h2>
              <p className="text-gray-700 whitespace-pre-line">{rx.dietAdvice}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Follow-up ─────────────────────────────────────────────────────────── */}
      {(rx.followUpDate || rx.followUpInstructions) && (
        <div className="mb-4 text-xs border border-blue-200 rounded p-2 bg-blue-50">
          <span className="font-semibold text-blue-800">Follow-up: </span>
          {rx.followUpDate && <span className="text-blue-700">{formatDate(rx.followUpDate)}</span>}
          {rx.followUpInstructions && (
            <span className="text-blue-700 ml-1">— {rx.followUpInstructions}</span>
          )}
        </div>
      )}

      {/* ── Doctor signature ──────────────────────────────────────────────────── */}
      <div className="mt-8 flex justify-end text-xs">
        <div className="text-center">
          <div className="h-10 border-b border-gray-500 w-32 mb-1" />
          <p>Dr. {doctor?.name}</p>
          <p className="text-gray-500">Signature</p>
        </div>
      </div>

      <ClinicPrintFooter clinic={clinic} />
    </div>
  );
};
