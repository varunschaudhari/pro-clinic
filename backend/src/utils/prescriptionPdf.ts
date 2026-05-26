import path from 'path';
import fs from 'fs';
import PDFDocument from 'pdfkit';
import QRCode from 'qrcode';
import { Response } from 'express';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PdfClinic {
  name: string;
  address?: { line1?: string; city?: string; state?: string; pincode?: string };
  mobile?: string;
  logoUrl?: string;
}

export interface PdfDoctor {
  name: string;
  specialization?: string;
  qualifications?: string[];
  licenseNumber?: string;
}

export interface PdfPatient {
  name: string;
  patientId: string;
  age?: number;
  ageUnit?: string;
  gender?: string;
  bloodGroup?: string;
}

export interface PdfMedicine {
  name: string;
  genericName?: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
  quantity?: number;
  unit?: string;
}

export interface PdfPrescription {
  _id: string;
  prescriptionNumber: string;
  createdAt: Date | string;
  diagnosis: string[];
  medicines: PdfMedicine[];
  labTests?: { name: string; urgency?: string }[];
  advice?: string;
  dietAdvice?: string;
  followUpDate?: Date | string;
  doctor: PdfDoctor;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const C = {
  primary:     '#4f46e5',
  headerBg:    '#f5f4ff',
  border:      '#e5e7eb',
  text:        '#111827',
  muted:       '#6b7280',
  tableHdr:    '#f3f4f6',
  tableAlt:    '#fafafa',
  footerLine:  '#d1d5db',
};

const PAGE_MARGINS = { top: 45, bottom: 45, left: 50, right: 50 };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d?: Date | string): string {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function readLogoBuffer(logoUrl?: string): Buffer | null {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), logoUrl);
      if (fs.existsSync(filePath)) return fs.readFileSync(filePath);
    }
  } catch {
    // logo not critical — skip silently
  }
  return null;
}

// Draws a horizontal rule
function hRule(doc: InstanceType<typeof PDFDocument>, x: number, y: number, width: number, color = C.border) {
  doc.save().moveTo(x, y).lineTo(x + width, y).strokeColor(color).lineWidth(0.5).stroke().restore();
}

// ── Core render: one prescription per page ────────────────────────────────────

async function renderPrescriptionPage(
  doc: InstanceType<typeof PDFDocument>,
  clinic: PdfClinic,
  patient: PdfPatient,
  rx: PdfPrescription,
  qrBuf: Buffer,
  logoBuf: Buffer | null,
) {
  const L = PAGE_MARGINS.left;
  const W = doc.page.width - PAGE_MARGINS.left - PAGE_MARGINS.right;
  const BOTTOM = doc.page.height - PAGE_MARGINS.bottom;

  let y = PAGE_MARGINS.top;

  // ── CLINIC HEADER ──────────────────────────────────────────────────────────
  doc.rect(L - 10, y - 8, W + 20, 70).fill(C.headerBg);

  let textX = L;
  if (logoBuf) {
    try {
      doc.image(logoBuf, L, y, { width: 52, height: 52 });
      textX = L + 60;
    } catch { /* skip bad image */ }
  }

  doc.font('Helvetica-Bold').fontSize(13).fillColor(C.primary)
    .text(clinic.name, textX, y + 2, { width: W - (textX - L) - 10 });

  const addrParts = [
    clinic.address?.line1,
    clinic.address?.city,
    clinic.address?.state,
    clinic.address?.pincode,
  ].filter(Boolean);

  if (addrParts.length) {
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
      .text(addrParts.join(', '), textX, y + 18, { width: W - (textX - L) - 10 });
  }
  if (clinic.mobile) {
    doc.font('Helvetica').fontSize(8).fillColor(C.muted)
      .text(`Ph: ${clinic.mobile}`, textX, y + 30);
  }

  y += 76;
  hRule(doc, L, y, W, C.primary);
  y += 10;

  // ── DOCTOR + RX META ───────────────────────────────────────────────────────
  const { doctor } = rx;
  const rxMetaX = L + W - 130;

  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.text)
    .text(`Dr. ${doctor.name}`, L, y);

  if (doctor.qualifications?.length) {
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
      .text(doctor.qualifications.join(', '), L, y + 13);
  }
  if (doctor.licenseNumber) {
    doc.font('Helvetica').fontSize(7.5).fillColor(C.muted)
      .text(`Reg: ${doctor.licenseNumber}`, L, y + 24);
  }

  // Right-aligned Rx number and date
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.text)
    .text(`Rx No: ${rx.prescriptionNumber}`, rxMetaX, y, { width: 130, align: 'right' });
  doc.font('Helvetica').fontSize(8).fillColor(C.muted)
    .text(`Date: ${fmtDate(rx.createdAt)}`, rxMetaX, y + 13, { width: 130, align: 'right' });

  y += 38;
  hRule(doc, L, y, W);
  y += 10;

  // ── PATIENT INFO ───────────────────────────────────────────────────────────
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.muted)
    .text('PATIENT', L, y);
  y += 11;

  doc.font('Helvetica-Bold').fontSize(12).fillColor(C.text)
    .text(patient.name, L, y);
  y += 16;

  const details = [
    `ID: ${patient.patientId}`,
    patient.age ? `${patient.age} ${patient.ageUnit ?? 'Yrs'}` : null,
    patient.gender ? patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1) : null,
    patient.bloodGroup ? `Blood: ${patient.bloodGroup}` : null,
  ].filter(Boolean).join('   ·   ');

  doc.font('Helvetica').fontSize(8.5).fillColor(C.muted).text(details, L, y);
  y += 14;

  hRule(doc, L, y, W);
  y += 12;

  // ── DIAGNOSIS ──────────────────────────────────────────────────────────────
  if (rx.diagnosis.length) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted).text('DIAGNOSIS', L, y);
    y += 12;
    doc.font('Helvetica').fontSize(9.5).fillColor(C.text)
      .text(rx.diagnosis.join('   ·   '), L, y, { width: W });
    y = doc.y + 12;
  }

  // ── MEDICINES TABLE ────────────────────────────────────────────────────────
  if (rx.medicines.length) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted).text('℞  MEDICINES', L, y);
    y += 11;

    // Column definitions (total = W)
    const cols = [
      { label: 'Medicine',     x: L,           w: 175 },
      { label: 'Dosage',       x: L + 175,     w: 60  },
      { label: 'Frequency',    x: L + 235,     w: 65  },
      { label: 'Duration',     x: L + 300,     w: 70  },
      { label: 'Instructions', x: L + 370,     w: W - 370 },
    ];

    // Header row
    const HDR_H = 17;
    doc.rect(L, y, W, HDR_H).fill(C.tableHdr);
    cols.forEach(col => {
      doc.font('Helvetica-Bold').fontSize(7.5).fillColor(C.muted)
        .text(col.label, col.x + 4, y + 5, { width: col.w - 8 });
    });
    y += HDR_H;

    rx.medicines.forEach((med, i) => {
      const rowH = med.genericName ? 28 : 18;

      if (i % 2 === 1) doc.rect(L, y, W, rowH).fill(C.tableAlt);

      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.text)
        .text(med.name, cols[0].x + 4, y + 4, { width: cols[0].w - 8, lineBreak: false });

      if (med.genericName) {
        doc.font('Helvetica').fontSize(7).fillColor(C.muted)
          .text(`(${med.genericName})`, cols[0].x + 4, y + 16, { width: cols[0].w - 8, lineBreak: false });
      }

      doc.font('Helvetica').fontSize(8.5).fillColor(C.text);
      [[1, med.dosage], [2, med.frequency], [3, med.duration], [4, med.instructions ?? '—']]
        .forEach(([ci, val]) => {
          const c = cols[ci as number]!;
          doc.text(String(val ?? '—'), c.x + 4, y + 4, { width: c.w - 8, lineBreak: false });
        });

      y += rowH;
    });

    hRule(doc, L, y, W);
    y += 12;
  }

  // ── LAB TESTS ──────────────────────────────────────────────────────────────
  if (rx.labTests?.length) {
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.muted).text('LAB TESTS', L, y);
    y += 11;
    rx.labTests.forEach(t => {
      const urgency = t.urgency && t.urgency !== 'routine' ? ` (${t.urgency})` : '';
      doc.font('Helvetica').fontSize(9).fillColor(C.text)
        .text(`•  ${t.name}${urgency}`, L + 8, y);
      y += 13;
    });
    y += 4;
  }

  // ── ADVICE ────────────────────────────────────────────────────────────────
  if (rx.advice) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
      .text('Advice: ', L, y, { continued: true })
      .font('Helvetica').fillColor(C.muted)
      .text(rx.advice, { width: W });
    y = doc.y + 6;
  }

  if (rx.dietAdvice) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.text)
      .text('Diet: ', L, y, { continued: true })
      .font('Helvetica').fillColor(C.muted)
      .text(rx.dietAdvice, { width: W });
    y = doc.y + 6;
  }

  // ── FOLLOW-UP ─────────────────────────────────────────────────────────────
  if (rx.followUpDate) {
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.primary)
      .text(`Follow-up on: ${fmtDate(rx.followUpDate)}`, L, y);
    y += 16;
  }

  // ── FOOTER: QR + disclaimer ───────────────────────────────────────────────
  const QR_SIZE = 62;
  const qrX = L + W - QR_SIZE;
  const qrY = BOTTOM - QR_SIZE - 22;

  doc.image(qrBuf, qrX, qrY, { width: QR_SIZE });
  doc.font('Helvetica').fontSize(6).fillColor(C.muted)
    .text('Scan to verify', qrX, qrY + QR_SIZE + 2, { width: QR_SIZE, align: 'center' });

  hRule(doc, L, BOTTOM - 16, W, C.footerLine);

  doc.font('Helvetica').fontSize(6.5).fillColor(C.muted)
    .text(
      `${clinic.name}  ·  Generated by ClinixIndia  ·  Valid only when issued by a registered medical practitioner`,
      L, BOTTOM - 11, { width: W - QR_SIZE - 10, align: 'left' },
    );
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Stream one or more prescriptions as a PDF response.
 * Each prescription occupies one A4 page.
 */
export async function streamPrescriptionPdf(
  res: Response,
  clinic: PdfClinic,
  patient: PdfPatient,
  prescriptions: PdfPrescription[],
  portalToken: string,
  clientUrl: string,
  filename: string,
): Promise<void> {
  const portalUrl = `${clientUrl}/portal/${portalToken}`;

  const [qrBuf, logoBuf] = await Promise.all([
    QRCode.toBuffer(portalUrl, { type: 'png', width: 90, margin: 1 }),
    Promise.resolve(readLogoBuffer(clinic.logoUrl)),
  ]);

  const doc = new PDFDocument({
    size: 'A4',
    margins: PAGE_MARGINS,
    info: {
      Title: `Prescription – ${patient.name}`,
      Author: prescriptions[0]?.doctor.name ?? clinic.name,
      Creator: 'ClinixIndia',
    },
    autoFirstPage: false,
  });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  doc.pipe(res);

  for (const rx of prescriptions) {
    doc.addPage();
    await renderPrescriptionPage(doc, clinic, patient, rx, qrBuf, logoBuf);
  }

  doc.end();
}
