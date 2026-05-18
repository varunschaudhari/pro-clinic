type Cell = string | number;

function escapeCsv(v: Cell): string {
  const s = String(v);
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

export function downloadCsv(filename: string, headers: string[], rows: Cell[][]): void {
  const lines = [
    headers.map(escapeCsv).join(','),
    ...rows.map((row) => row.map(escapeCsv).join(',')),
  ];
  // BOM prefix makes Excel correctly interpret UTF-8
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function printReportAsPdf(opts: {
  clinicName: string;
  title:      string;
  subtitle:   string;
  headers:    string[];
  rows:       Cell[][];
}): void {
  const { clinicName, title, subtitle, headers, rows } = opts;

  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const headCells = headers.map((h) => `<th>${esc(h)}</th>`).join('');
  const bodyRows  = rows.map(
    (row) => `<tr>${row.map((c) => `<td>${esc(String(c))}</td>`).join('')}</tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111; padding: 24px; }
  .header { margin-bottom: 16px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; }
  .clinic { font-size: 14px; font-weight: 700; color: #111; }
  .title  { font-size: 18px; font-weight: 700; margin: 4px 0 2px; }
  .sub    { font-size: 11px; color: #6b7280; }
  table   { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 10px; }
  th      { background: #f3f4f6; text-align: left; padding: 5px 7px; border: 1px solid #d1d5db;
            font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; white-space: nowrap; }
  td      { padding: 5px 7px; border: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }
  .footer { margin-top: 14px; font-size: 9px; color: #9ca3af; }
  @media print {
    body { padding: 0; }
    @page { margin: 12mm 14mm; size: A4 landscape; }
  }
</style>
</head>
<body>
  <div class="header">
    <div class="clinic">${esc(clinicName)}</div>
    <div class="title">${esc(title)}</div>
    <div class="sub">${esc(subtitle)} &nbsp;·&nbsp; Generated ${new Date().toLocaleString('en-IN')}</div>
  </div>
  <table>
    <thead><tr>${headCells}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <div class="footer">${rows.length} record${rows.length !== 1 ? 's' : ''}</div>
  <script>
    window.onload = function () {
      window.print();
      window.onafterprint = function () { window.close(); };
    };
  </script>
</body>
</html>`;

  const popup = window.open('', '_blank', 'width=1000,height=750');
  if (popup) {
    popup.document.write(html);
    popup.document.close();
  }
}
