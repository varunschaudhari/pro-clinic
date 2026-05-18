import { PAYMENT_STATUS_CONFIG, PAYMENT_MODE_LABELS } from '@/constants/billing';
import type { InvoiceDoc } from '@/services/billing.service';
import type { ClinicPrintInfo } from '@/services/clinic.service';
import { ClinicPrintHeader, ClinicPrintFooter } from '@/components/print/ClinicPrintHeader';

interface InvoicePrintViewProps {
  invoice: InvoiceDoc;
  clinic?: ClinicPrintInfo | null;
}

const fmt = (n: number) => `₹${n.toFixed(2)}`;
const fmtDate = (d?: string) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const InvoicePrintView = ({ invoice: inv, clinic }: InvoicePrintViewProps) => {
  const statusCfg = PAYMENT_STATUS_CONFIG[inv.paymentStatus];

  return (
    <div className="bg-white text-gray-900 font-sans text-sm" id="inv-print-area">
      <ClinicPrintHeader
        clinic={clinic}
        rightSlot={
          <>
            <p className="text-lg font-bold text-gray-700 mb-0.5">TAX INVOICE</p>
            <p>Invoice No: <span className="font-semibold">{inv.invoiceNumber}</span></p>
            <p>Date: {fmtDate(inv.invoiceDate)}</p>
            {inv.dueDate && <p>Due: {fmtDate(inv.dueDate)}</p>}
          </>
        }
      />

      {/* ── Patient Info ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
        <div className="border border-gray-200 rounded p-3 bg-gray-50">
          <p className="font-semibold text-gray-700 mb-1">Bill To</p>
          <p className="font-medium text-base">{inv.patient.name}</p>
          <p className="text-gray-500">{inv.patient.mobile}</p>
          <p className="text-gray-500">
            {inv.patient.gender.charAt(0).toUpperCase() + inv.patient.gender.slice(1)}
            {inv.patient.age ? ` · ${inv.patient.age} ${inv.patient.ageUnit ?? 'yrs'}` : ''}
          </p>
          <p className="text-gray-400 mt-1">ID: {inv.patient.patientId}</p>
          {inv.patientGstin && (
            <p className="text-gray-500 mt-0.5">GSTIN: {inv.patientGstin}</p>
          )}
        </div>
        <div className="border border-gray-200 rounded p-3 bg-gray-50 text-right">
          <div
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold mb-2 ${statusCfg.badge}`}
          >
            {statusCfg.label}
          </div>
          <div className="space-y-0.5 text-gray-600">
            <p>Total: <span className="font-bold text-gray-900">{fmt(inv.totalAmount)}</span></p>
            <p>Paid: <span className="font-semibold text-green-700">{fmt(inv.paidAmount)}</span></p>
            {inv.balanceAmount > 0 && (
              <p>Balance: <span className="font-semibold text-red-600">{fmt(inv.balanceAmount)}</span></p>
            )}
          </div>
          {inv.isInterState && (
            <p className="text-gray-400 mt-1 text-[10px]">Inter-state supply (IGST)</p>
          )}
        </div>
      </div>

      {/* ── Items Table ───────────────────────────────────────────────────────── */}
      <table className="w-full border-collapse text-xs mb-4">
        <thead>
          <tr className="bg-gray-100 border-t border-b border-gray-300">
            <th className="text-left py-1.5 px-2 w-6">#</th>
            <th className="text-left py-1.5 px-2">Description</th>
            <th className="text-left py-1.5 px-2 w-12">HSN</th>
            <th className="text-right py-1.5 px-2 w-10">Qty</th>
            <th className="text-right py-1.5 px-2 w-20">Rate</th>
            <th className="text-right py-1.5 px-2 w-16">Disc.</th>
            <th className="text-right py-1.5 px-2 w-20">Taxable</th>
            {inv.isInterState ? (
              <th className="text-right py-1.5 px-2 w-20">IGST</th>
            ) : (
              <>
                <th className="text-right py-1.5 px-2 w-16">CGST</th>
                <th className="text-right py-1.5 px-2 w-16">SGST</th>
              </>
            )}
            <th className="text-right py-1.5 px-2 w-20 font-bold">Total</th>
          </tr>
        </thead>
        <tbody>
          {inv.items.map((item, i) => (
            <tr key={i} className="border-b border-gray-100">
              <td className="py-1.5 px-2 text-gray-400">{i + 1}</td>
              <td className="py-1.5 px-2">
                <span className="font-medium">{item.description}</span>
                <span className="text-gray-400 ml-1 capitalize">({item.type})</span>
              </td>
              <td className="py-1.5 px-2 text-gray-400">{item.hsnCode ?? '—'}</td>
              <td className="py-1.5 px-2 text-right">{item.quantity}</td>
              <td className="py-1.5 px-2 text-right">{fmt(item.unitPrice)}</td>
              <td className="py-1.5 px-2 text-right">{item.discount > 0 ? fmt(item.discount) : '—'}</td>
              <td className="py-1.5 px-2 text-right">{fmt(item.taxableAmount)}</td>
              {inv.isInterState ? (
                <td className="py-1.5 px-2 text-right">
                  {fmt(item.igstAmount)}
                  {item.gstRate > 0 && <span className="text-gray-400 ml-0.5">({item.gstRate}%)</span>}
                </td>
              ) : (
                <>
                  <td className="py-1.5 px-2 text-right">
                    {fmt(item.cgstAmount)}
                    {item.gstRate > 0 && <span className="text-gray-400 ml-0.5">({item.gstRate / 2}%)</span>}
                  </td>
                  <td className="py-1.5 px-2 text-right">
                    {fmt(item.sgstAmount)}
                    {item.gstRate > 0 && <span className="text-gray-400 ml-0.5">({item.gstRate / 2}%)</span>}
                  </td>
                </>
              )}
              <td className="py-1.5 px-2 text-right font-semibold">{fmt(item.totalAmount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ── Totals ────────────────────────────────────────────────────────────── */}
      <div className="flex justify-end mb-4">
        <div className="w-64 space-y-1 text-xs">
          <div className="flex justify-between text-gray-600">
            <span>Subtotal</span><span>{fmt(inv.subtotal)}</span>
          </div>
          {inv.totalDiscount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>Discount</span><span>- {fmt(inv.totalDiscount)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-600">
            <span>Taxable Amount</span><span>{fmt(inv.totalTaxableAmount)}</span>
          </div>
          {inv.isInterState ? (
            <div className="flex justify-between text-gray-600">
              <span>IGST</span><span>{fmt(inv.totalIGST)}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-gray-600">
                <span>CGST</span><span>{fmt(inv.totalCGST)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>SGST</span><span>{fmt(inv.totalSGST)}</span>
              </div>
            </>
          )}
          {inv.roundOff !== 0 && (
            <div className="flex justify-between text-gray-400 text-[10px]">
              <span>Round Off</span>
              <span>{inv.roundOff > 0 ? '+' : ''}{fmt(inv.roundOff)}</span>
            </div>
          )}
          <div className="border-t border-gray-300 pt-1 flex justify-between font-bold text-sm">
            <span>Total</span><span>{fmt(inv.totalAmount)}</span>
          </div>
          <div className="flex justify-between text-green-700 font-medium">
            <span>Amount Paid</span><span>{fmt(inv.paidAmount)}</span>
          </div>
          {inv.balanceAmount > 0 && (
            <div className="flex justify-between text-red-600 font-semibold">
              <span>Balance Due</span><span>{fmt(inv.balanceAmount)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Pay To ───────────────────────────────────────────────────────────── */}
      {clinic?.bankAccount && (clinic.bankAccount.upiId || clinic.bankAccount.accountNumber) && (
        <div className="mb-4 border border-gray-200 rounded p-3 bg-gray-50 text-xs">
          <p className="font-semibold text-gray-700 mb-1.5">Pay To</p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-0.5 text-gray-600">
            {clinic.bankAccount.accountHolderName && (
              <p><span className="text-gray-400">Name:</span> {clinic.bankAccount.accountHolderName}</p>
            )}
            {clinic.bankAccount.bankName && (
              <p><span className="text-gray-400">Bank:</span> {clinic.bankAccount.bankName}</p>
            )}
            {clinic.bankAccount.accountNumber && (
              <p><span className="text-gray-400">A/C No:</span> {clinic.bankAccount.accountNumber}</p>
            )}
            {clinic.bankAccount.ifscCode && (
              <p><span className="text-gray-400">IFSC:</span> {clinic.bankAccount.ifscCode}</p>
            )}
            {clinic.bankAccount.upiId && (
              <p className="col-span-2"><span className="text-gray-400">UPI:</span> <strong>{clinic.bankAccount.upiId}</strong></p>
            )}
          </div>
        </div>
      )}

      {/* ── Payment History ───────────────────────────────────────────────────── */}
      {inv.payments.length > 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-700 mb-1">Payment History</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 border border-gray-200">
                <th className="text-left py-1 px-2">Date</th>
                <th className="text-left py-1 px-2">Mode</th>
                <th className="text-left py-1 px-2">Ref / Txn ID</th>
                <th className="text-right py-1 px-2">Amount</th>
              </tr>
            </thead>
            <tbody>
              {inv.payments.map((p, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1 px-2 text-gray-600">{fmtDate(p.paidAt)}</td>
                  <td className="py-1 px-2 capitalize">{PAYMENT_MODE_LABELS[p.mode]}</td>
                  <td className="py-1 px-2 text-gray-400">{p.transactionId ?? '—'}</td>
                  <td className="py-1 px-2 text-right font-semibold">{fmt(p.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Notes / Terms ─────────────────────────────────────────────────────── */}
      {(inv.notes || inv.termsAndConditions) && (
        <div className="border-t border-gray-200 pt-3 text-xs text-gray-500 space-y-1">
          {inv.notes && <p><span className="font-semibold text-gray-700">Notes:</span> {inv.notes}</p>}
          {inv.termsAndConditions && <p><span className="font-semibold text-gray-700">Terms:</span> {inv.termsAndConditions}</p>}
        </div>
      )}

      {/* ── Cancelled watermark ───────────────────────────────────────────────── */}
      {inv.isCancelled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 rotate-[-30deg]">
          <span className="text-6xl font-black text-red-600 border-8 border-red-600 px-6 py-3 rounded">CANCELLED</span>
        </div>
      )}

      <ClinicPrintFooter clinic={clinic} />
    </div>
  );
};
