import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileText, FlaskConical, AlertCircle, Download, ExternalLink } from 'lucide-react';
import { portalApi, type PortalData } from '@/services/portal.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

const LAB_STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ordered:          { label: 'Ordered',           cls: 'bg-gray-100 text-gray-700' },
  sample_collected: { label: 'Sample Collected',  cls: 'bg-blue-100 text-blue-700' },
  processing:       { label: 'Processing',        cls: 'bg-amber-100 text-amber-700' },
  completed:        { label: 'Completed',         cls: 'bg-green-100 text-green-700' },
  cancelled:        { label: 'Cancelled',         cls: 'bg-red-100 text-red-600' },
};

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ icon, title, children }: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      </div>
      {children}
    </section>
  );
}

// ── Prescription card ─────────────────────────────────────────────────────────

function PrescriptionCard({ rx }: { rx: PortalData['prescriptions'][0] }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 mb-3 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {rx.prescriptionNumber}
          </p>
          {rx.diagnosis.length > 0 && (
            <p className="text-sm font-medium text-gray-800 mt-0.5">
              {rx.diagnosis.join(', ')}
            </p>
          )}
        </div>
        <div className="text-right shrink-0 ml-2">
          <p className="text-xs text-gray-500">{fmtDate(rx.createdAt)}</p>
          {rx.doctorId && (
            <p className="text-xs text-gray-500">
              Dr. {rx.doctorId.name}
              {rx.doctorId.specialization ? ` · ${rx.doctorId.specialization}` : ''}
            </p>
          )}
        </div>
      </div>

      {rx.medicines.length > 0 && (
        <table className="w-full text-xs mt-2 border-collapse">
          <thead>
            <tr className="bg-gray-50 border-y border-gray-100">
              <th className="text-left py-1.5 px-2 font-medium text-gray-600">Medicine</th>
              <th className="text-left py-1.5 px-2 font-medium text-gray-600 hidden sm:table-cell">Dosage</th>
              <th className="text-left py-1.5 px-2 font-medium text-gray-600">Frequency</th>
              <th className="text-left py-1.5 px-2 font-medium text-gray-600 hidden sm:table-cell">Duration</th>
            </tr>
          </thead>
          <tbody>
            {rx.medicines.map((m, i) => (
              <tr key={i} className="border-b border-gray-50 last:border-0">
                <td className="py-1.5 px-2 font-medium text-gray-800">{m.name}</td>
                <td className="py-1.5 px-2 text-gray-600 hidden sm:table-cell">{m.dosage ?? '—'}</td>
                <td className="py-1.5 px-2 text-gray-600">{m.frequency ?? '—'}</td>
                <td className="py-1.5 px-2 text-gray-600 hidden sm:table-cell">
                  {m.durationValue ? `${m.durationValue} ${m.durationUnit ?? ''}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {rx.advice && (
        <p className="mt-2 text-xs text-gray-600">
          <span className="font-semibold text-gray-700">Advice: </span>{rx.advice}
        </p>
      )}
      {rx.dietAdvice && (
        <p className="mt-1 text-xs text-gray-600">
          <span className="font-semibold text-gray-700">Diet: </span>{rx.dietAdvice}
        </p>
      )}
      {rx.followUpDate && (
        <p className="mt-1 text-xs text-blue-600 font-medium">
          Follow-up: {fmtDate(rx.followUpDate)}
        </p>
      )}
    </div>
  );
}

// ── Lab report card ───────────────────────────────────────────────────────────

function LabCard({ report }: { report: PortalData['labReports'][0] }) {
  const statusCfg = LAB_STATUS_CFG[report.status] ?? { label: report.status, cls: 'bg-gray-100 text-gray-700' };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 mb-3 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {report.reportNumber}
          </p>
          <p className="text-sm font-medium text-gray-800 mt-0.5">
            {report.testName}
            {report.testCategory && (
              <span className="text-gray-500 font-normal ml-1">({report.testCategory})</span>
            )}
          </p>
        </div>
        <div className="text-right shrink-0 ml-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusCfg.cls}`}>
            {statusCfg.label}
          </span>
          <p className="text-xs text-gray-500 mt-0.5">
            {fmtDate(report.reportDate ?? report.createdAt)}
          </p>
          {report.orderedBy && (
            <p className="text-xs text-gray-500">Dr. {report.orderedBy.name}</p>
          )}
        </div>
      </div>

      {report.results.length > 0 && (
        <table className="w-full text-xs mt-2 border-collapse">
          <thead>
            <tr className="bg-gray-50 border-y border-gray-100">
              <th className="text-left py-1.5 px-2 font-medium text-gray-600">Parameter</th>
              <th className="text-left py-1.5 px-2 font-medium text-gray-600">Value</th>
              <th className="text-left py-1.5 px-2 font-medium text-gray-600 hidden sm:table-cell">Reference</th>
            </tr>
          </thead>
          <tbody>
            {report.results.map((r, i) => (
              <tr key={i} className={`border-b border-gray-50 last:border-0 ${r.isAbnormal ? 'bg-red-50/50' : ''}`}>
                <td className="py-1.5 px-2 text-gray-700">{r.parameter}</td>
                <td className={`py-1.5 px-2 font-medium ${r.isAbnormal ? 'text-red-600' : 'text-gray-800'}`}>
                  {r.value} {r.unit}
                  {r.flags && <span className="ml-1 text-red-500 font-bold">{r.flags}</span>}
                </td>
                <td className="py-1.5 px-2 text-gray-500 hidden sm:table-cell">{r.referenceRange ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {report.interpretation && (
        <p className="mt-2 text-xs text-gray-600">
          <span className="font-semibold text-gray-700">Interpretation: </span>{report.interpretation}
        </p>
      )}
      {report.remarks && (
        <p className="mt-1 text-xs text-gray-600">
          <span className="font-semibold text-gray-700">Remarks: </span>{report.remarks}
        </p>
      )}

      {report.fileUrls.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {report.fileUrls.map((url, i) => {
            const isPdf = url.toLowerCase().endsWith('.pdf');
            return (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
              >
                {isPdf ? <Download className="h-3.5 w-3.5" /> : <ExternalLink className="h-3.5 w-3.5" />}
                {isPdf ? `Report ${i + 1} (PDF)` : `File ${i + 1}`}
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PortalPage() {
  const { token } = useParams<{ token: string }>();
  const [data, setData]       = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setError('Invalid link.'); setLoading(false); return; }
    portalApi.getData(token)
      .then((res) => setData(res.data.data))
      .catch((err) => setError(err?.response?.data?.message ?? 'Failed to load portal. The link may be invalid or expired.'))
      .finally(() => setLoading(false));
  }, [token]);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-500">
          <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-sm">Loading your records…</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-sm w-full rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm font-semibold text-gray-800">Unable to load records</p>
          <p className="text-xs text-gray-500 mt-1.5">{error}</p>
        </div>
      </div>
    );
  }

  const { clinic, patient } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Clinic header ──────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 print:border-0">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
          {clinic.logoUrl && (
            <img
              src={clinic.logoUrl}
              alt={clinic.name}
              className="h-12 w-12 object-contain rounded-lg border border-gray-100"
            />
          )}
          <div>
            <h1 className="text-lg font-bold text-gray-900">{clinic.name}</h1>
            {clinic.address && (
              <p className="text-xs text-gray-500">
                {[clinic.address.line1, clinic.address.city, clinic.address.state]
                  .filter(Boolean).join(', ')}
              </p>
            )}
            {clinic.mobile && (
              <p className="text-xs text-gray-500">{clinic.mobile}</p>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-5">
        {/* ── Patient card ─────────────────────────────────────────────────── */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6 shadow-sm">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Patient</p>
          <p className="text-xl font-bold text-gray-900">{patient.name}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
            <span>ID: {patient.patientId}</span>
            {patient.age && (
              <span>{patient.age} {patient.ageUnit ?? 'yrs'}</span>
            )}
            <span className="capitalize">{patient.gender}</span>
            {patient.bloodGroup && <span>Blood: {patient.bloodGroup}</span>}
          </div>
        </div>

        {/* ── Prescriptions ────────────────────────────────────────────────── */}
        <Section
          icon={<FileText className="h-5 w-5 text-violet-500" />}
          title={`Prescriptions (${data.prescriptions.length})`}
        >
          {data.prescriptions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6 bg-white rounded-lg border border-gray-100">
              No prescriptions on record.
            </p>
          ) : (
            data.prescriptions.map((rx) => <PrescriptionCard key={rx._id} rx={rx} />)
          )}
        </Section>

        {/* ── Lab Reports ──────────────────────────────────────────────────── */}
        <Section
          icon={<FlaskConical className="h-5 w-5 text-blue-500" />}
          title={`Lab Reports (${data.labReports.length})`}
        >
          {data.labReports.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6 bg-white rounded-lg border border-gray-100">
              No lab reports on record.
            </p>
          ) : (
            data.labReports.map((r) => <LabCard key={r._id} report={r} />)
          )}
        </Section>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <p className="text-center text-[10px] text-gray-400 mt-4 pb-8">
          This link expires on {fmtDate(data.expiresAt)} · Powered by ClinixIndia
        </p>
      </main>
    </div>
  );
}
