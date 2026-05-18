import { LAB_STATUS_CONFIG, FLAG_CONFIG } from '@/constants/labReport';
import type { LabReportDoc } from '@/services/labReport.service';
import type { ClinicPrintInfo } from '@/services/clinic.service';
import { ClinicPrintHeader, ClinicPrintFooter } from '@/components/print/ClinicPrintHeader';

interface LabReportPrintViewProps {
  report: LabReportDoc;
  clinic?: ClinicPrintInfo | null;
}

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const fmtDateTime = (d?: string) =>
  d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const LabReportPrintView = ({ report, clinic }: LabReportPrintViewProps) => {
  const statusCfg     = LAB_STATUS_CONFIG[report.status];
  const abnormalCount = report.results.filter((r) => r.isAbnormal).length;

  return (
    <div className="bg-white text-gray-900 font-sans text-sm" id="lab-print-area">
      <ClinicPrintHeader
        clinic={clinic}
        rightSlot={
          <>
            <p className="text-sm font-bold text-gray-700 mb-0.5">Laboratory Report</p>
            <p>Report No: <span className="font-semibold">{report.reportNumber}</span></p>
            <p>Report Date: {fmtDate(report.reportDate)}</p>
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusCfg.badge}`}>
              {statusCfg.label}
            </span>
          </>
        }
      />

      {/* ── Patient + Test Info ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div className="border border-gray-200 rounded p-3 bg-gray-50">
          <p className="font-semibold text-gray-700 mb-1">Patient Details</p>
          <p className="font-medium text-sm">{report.patient.name}</p>
          <p className="text-gray-500">{report.patient.mobile}</p>
          <p className="text-gray-500">
            {report.patient.gender.charAt(0).toUpperCase() + report.patient.gender.slice(1)}
            {report.patient.age ? ` · ${report.patient.age} ${report.patient.ageUnit ?? 'yrs'}` : ''}
          </p>
          <p className="text-gray-400 mt-1">ID: {report.patient.patientId}</p>
        </div>
        <div className="border border-gray-200 rounded p-3 bg-gray-50">
          <p className="font-semibold text-gray-700 mb-1">Test Information</p>
          <p className="font-medium text-sm">{report.testName}</p>
          {report.testCategory && <p className="text-gray-500">{report.testCategory}</p>}
          {report.sampleType && (
            <p className="text-gray-500">Sample: {report.sampleType}</p>
          )}
          {report.sampleCollectedAt && (
            <p className="text-gray-500">Collected: {fmtDateTime(report.sampleCollectedAt)}</p>
          )}
          <p className="text-gray-500 mt-1">
            Ordered by: Dr. {report.orderedBy.name}
          </p>
        </div>
      </div>

      {/* ── Lab info ──────────────────────────────────────────────────────────── */}
      {(report.labName || report.labContactNo) && (
        <div className="mb-3 text-xs text-gray-500 border-l-2 border-blue-200 pl-3">
          <span className="font-semibold text-gray-700">Referred to: </span>
          {report.labName}
          {report.labContactNo && ` · ${report.labContactNo}`}
          {report.labAddress && ` · ${report.labAddress}`}
        </div>
      )}

      {/* ── Results table ─────────────────────────────────────────────────────── */}
      {report.results.length > 0 && (
        <div className="mb-4">
          {abnormalCount > 0 && (
            <p className="text-xs text-orange-600 mb-1.5 font-medium">
              ⚠ {abnormalCount} abnormal value{abnormalCount !== 1 ? 's' : ''} detected
            </p>
          )}
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-gray-100 border-t border-b border-gray-300">
                <th className="text-left py-1.5 px-2">Parameter</th>
                <th className="text-right py-1.5 px-2 w-24">Value</th>
                <th className="text-left py-1.5 px-2 w-16">Unit</th>
                <th className="text-left py-1.5 px-2 w-32">Reference Range</th>
                <th className="text-center py-1.5 px-2 w-16">Flag</th>
              </tr>
            </thead>
            <tbody>
              {report.results.map((r, i) => {
                const flagCfg = r.flags ? FLAG_CONFIG[r.flags] : null;
                return (
                  <tr
                    key={i}
                    className={`border-b ${r.isAbnormal ? 'bg-orange-50' : i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                  >
                    <td className={`py-1.5 px-2 ${r.isAbnormal ? 'font-semibold' : ''}`}>
                      {r.parameter}
                    </td>
                    <td className={`py-1.5 px-2 text-right font-mono ${flagCfg?.color ?? ''}`}>
                      {r.value}
                    </td>
                    <td className="py-1.5 px-2 text-gray-500">{r.unit ?? '—'}</td>
                    <td className="py-1.5 px-2 text-gray-400">{r.referenceRange ?? '—'}</td>
                    <td className={`py-1.5 px-2 text-center font-bold text-xs ${flagCfg?.color ?? 'text-green-600'}`}>
                      {r.flags ?? '✓'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Interpretation ────────────────────────────────────────────────────── */}
      {report.interpretation && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-700 mb-1">Interpretation</p>
          <p className="text-xs text-gray-600 whitespace-pre-line border-l-2 border-gray-300 pl-3">
            {report.interpretation}
          </p>
        </div>
      )}

      {/* ── Remarks ───────────────────────────────────────────────────────────── */}
      {report.remarks && (
        <div className="mb-3">
          <p className="text-xs font-semibold text-gray-700 mb-1">Remarks</p>
          <p className="text-xs text-gray-600">{report.remarks}</p>
        </div>
      )}

      {/* ── File links ────────────────────────────────────────────────────────── */}
      {report.fileUrls.length > 0 && (
        <div className="mb-3 print:hidden">
          <p className="text-xs font-semibold text-gray-700 mb-1">Attached Files</p>
          <ul className="space-y-0.5">
            {report.fileUrls.map((url, i) => (
              <li key={i}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline"
                >
                  {url}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── Doctor comment (not printed) ──────────────────────────────────────── */}
      {report.doctorComment && (
        <div className="mb-4 p-3 rounded bg-blue-50 border border-blue-200 print:hidden">
          <p className="text-xs font-semibold text-blue-800 mb-1">Doctor Comment (Internal)</p>
          <p className="text-xs text-blue-700 whitespace-pre-line">{report.doctorComment}</p>
        </div>
      )}

      <ClinicPrintFooter
        clinic={clinic}
        rightSlot={<span>Report Date: {fmtDate(report.reportDate)}</span>}
      />
    </div>
  );
};
