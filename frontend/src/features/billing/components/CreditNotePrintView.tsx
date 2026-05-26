import type { CreditNoteDoc } from '@/services/billing.service';
import type { ClinicPrintInfo } from '@/services/clinic.service';
import { ClinicPrintHeader, ClinicPrintFooter } from '@/components/print/ClinicPrintHeader';

const REFUND_MODE_LABELS: Record<string, string> = {
  cash:          'Cash',
  upi:           'UPI',
  bank_transfer: 'Bank Transfer',
  other:         'Other',
};

const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

interface CreditNotePrintViewProps {
  cn:     CreditNoteDoc;
  clinic?: ClinicPrintInfo | null;
}

export const CreditNotePrintView = ({ cn, clinic }: CreditNotePrintViewProps) => {
  const p = cn.patient;

  return (
    <div className="bg-white text-gray-900 font-sans text-sm" id="cn-print-area">
      <ClinicPrintHeader
        clinic={clinic}
        rightSlot={
          <>
            <p className="text-lg font-bold text-red-700 mb-0.5">CREDIT NOTE</p>
            <p>Credit Note No: <span className="font-semibold">{cn.creditNoteNumber}</span></p>
            <p>Date: {fmtDate(cn.issuedAt)}</p>
            <p>Against: <span className="font-semibold font-mono">{cn.invoiceNumber}</span></p>
          </>
        }
      />

      {/* ── Patient + Summary ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div className="border border-gray-200 rounded p-3 bg-gray-50">
          <p className="font-semibold text-gray-700 mb-1">Credit Issued To</p>
          <p className="font-medium text-base">{p.name}</p>
          <p className="text-gray-500">{p.mobile}</p>
          <p className="text-gray-500">
            {p.gender.charAt(0).toUpperCase() + p.gender.slice(1)}
            {p.age ? ` · ${p.age} ${p.ageUnit ?? 'yrs'}` : ''}
          </p>
          <p className="text-gray-400 mt-1">ID: {p.patientId}</p>
        </div>

        <div className="border border-red-100 rounded p-3 bg-red-50 text-right">
          <p className="text-xs text-gray-500 mb-1">Refund Amount</p>
          <p className="text-2xl font-bold text-red-700">₹{cn.amount.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-2">Mode: <span className="font-semibold">{REFUND_MODE_LABELS[cn.refundMode] ?? cn.refundMode}</span></p>
          {cn.refundTransactionId && (
            <p className="text-xs text-gray-500">Ref: <span className="font-mono">{cn.refundTransactionId}</span></p>
          )}
        </div>
      </div>

      {/* ── Reason ───────────────────────────────────────────────────────────── */}
      <div className="border border-gray-200 rounded p-3 mb-4 text-xs bg-gray-50">
        <p className="font-semibold text-gray-700 mb-1">Reason for Refund</p>
        <p className="text-gray-600">{cn.reason}</p>
      </div>

      {/* ── Summary table ─────────────────────────────────────────────────────── */}
      <table className="w-full text-xs mb-4 border border-gray-200 rounded overflow-hidden">
        <thead>
          <tr className="bg-gray-100">
            <th className="text-left px-3 py-2 font-semibold text-gray-600">Description</th>
            <th className="text-right px-3 py-2 font-semibold text-gray-600">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-t border-gray-200">
            <td className="px-3 py-2 text-gray-700">
              Full refund against invoice <span className="font-mono font-semibold">{cn.invoiceNumber}</span>
            </td>
            <td className="px-3 py-2 text-right font-bold text-red-700">− ₹{cn.amount.toFixed(2)}</td>
          </tr>
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-gray-300 bg-red-50">
            <td className="px-3 py-2 font-bold text-gray-800 text-right">Total Refunded</td>
            <td className="px-3 py-2 text-right font-bold text-red-700 text-base">₹{cn.amount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      {/* ── Issued by ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between text-xs text-gray-500 mt-6">
        <p>Issued by: <span className="font-semibold text-gray-700">{cn.issuedBy.name}</span></p>
        <p>Date: {fmtDate(cn.issuedAt)}</p>
      </div>

      <ClinicPrintFooter />
    </div>
  );
};
