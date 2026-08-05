import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiClient from '../services/api';
import i18n from '../i18n';
import logoUrl from '../assets/konkuwan_logo_primary.svg';

// ── Document language ──────────────────────────────────────────────────────
// Every label below is resolved through i18n (the `doc.*` namespace) instead
// of being hardcoded, so a document follows the user's chosen language.
//
// jsPDF can only lay out scripts that need no shaping: its core fonts are
// Latin-1, and even an embedded TTF gets glyphs looked up one codepoint at a
// time with no Indic shaping — Odia pre-base matras (ି) and virama conjuncts
// (୍) would come out reordered and unreadable on a legal document. So a
// language is used for PDFs only once it is listed here; anything else falls
// back to English. Add 'or' when a shaping-capable renderer is in place.
const PDF_LANGUAGES = ['en'];
function docT() {
  const lng = String(i18n.resolvedLanguage || i18n.language || 'en').split('-')[0];
  return i18n.getFixedT(PDF_LANGUAGES.includes(lng) ? lng : 'en');
}

// ── Number to Indian words (for "Total (in words)") ────────────────────────
const ONES = ['', 'ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE', 'TEN',
  'ELEVEN', 'TWELVE', 'THIRTEEN', 'FOURTEEN', 'FIFTEEN', 'SIXTEEN', 'SEVENTEEN', 'EIGHTEEN', 'NINETEEN'];
const TENS = ['', '', 'TWENTY', 'THIRTY', 'FORTY', 'FIFTY', 'SIXTY', 'SEVENTY', 'EIGHTY', 'NINETY'];
 
function twoDigits(n) {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ' ' + ONES[n % 10] : ''}`;
}
function threeDigits(n) {
  const h = Math.floor(n / 100), r = n % 100;
  return `${h ? ONES[h] + ' HUNDRED' + (r ? ' ' : '') : ''}${r ? twoDigits(r) : ''}`;
}
function numberToWords(num) {
  num = Math.round(Number(num) || 0);
  if (num === 0) return 'ZERO';
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh = Math.floor(num / 100000); num %= 100000;
  const thousand = Math.floor(num / 1000); num %= 1000;
  const rest = num;
  let words = '';
  if (crore) words += `${twoDigits(crore)} CRORE `;
  if (lakh) words += `${twoDigits(lakh)} LAKH `;
  if (thousand) words += `${twoDigits(thousand)} THOUSAND `;
  if (rest) words += threeDigits(rest);
  return words.trim();
}
 
// Rasterize the SVG logo to PNG (jsPDF can't embed SVG directly).
async function logoAsPng() {
  try {
    const svgText = await fetch(logoUrl).then(r => r.text());
    const blob = new Blob([svgText], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const canvas = document.createElement('canvas');
    canvas.width = 600; canvas.height = 156;
    canvas.getContext('2d').drawImage(img, 0, 0, 600, 156);
    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}

const inr = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 })}`;
 
// Brand colours (kept from the current invoice look)
const FOREST = [22, 47, 34];
const PANEL = [244, 239, 230];   // cream panel
const HEAD = [22, 47, 34];       // table header
 
// Shared header: title, doc number/date, logo
function drawHeader(doc, pageW, { title, numberLabel, numberValue, dateLabel, dateValue }, logo) {
  doc.setFont('helvetica', 'bold').setFontSize(26).setTextColor(...FOREST);
  doc.text(title, 40, 58);
 
  doc.setFontSize(9.5).setTextColor(90);
  doc.setFont('helvetica', 'bold').text(numberLabel, 40, 86);
  doc.setFont('helvetica', 'normal').text(String(numberValue || '—'), 140, 86);
  doc.setFont('helvetica', 'bold').text(dateLabel, 40, 102);
  doc.setFont('helvetica', 'normal').text(String(dateValue || '—'), 140, 102);
 
  if (logo) doc.addImage(logo, 'PNG', pageW - 150, 34, 110, 29);
}
 
// Break `text` into lines that fit `maxW` at the font currently set on `doc`.
// splitTextToSize wraps on whitespace but leaves a single word wider than the
// box untouched (a run-on address, a long email), so those get hard-chopped.
function fitLines(doc, text, maxW) {
  const out = [];
  doc.splitTextToSize(String(text), maxW).forEach((line) => {
    let rest = line;
    while (doc.getTextWidth(rest) > maxW && rest.length > 1) {
      let cut = rest.length;
      while (cut > 1 && doc.getTextWidth(rest.slice(0, cut)) > maxW) cut--;
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    out.push(rest);
  });
  return out;
}
 
// Shared two-panel block: "From/Billed By" | "To/Billed For".
// Every line is wrapped to the panel width and the panel grows to fit the
// taller of the two columns, so a long address stays inside its box and the
// content below simply starts lower instead of being overlapped.
function drawParties(doc, pageW, leftTitle, left, rightTitle, right, top) {
  const gap = 16, panelW = (pageW - 80 - gap) / 2;
  const lx = 40, rx = 40 + panelW + gap;
  const padX = 14, lineH = 14, firstLineY = 42, padBottom = 10;
  const textW = panelW - padX * 2;
 
  // Wrap up front so the panel height is known before anything is drawn.
  // Index 0 (the party name) stays bold, matching the original look.
  const measure = (lines) => {
    doc.setFontSize(9);
    return lines
      .map((text, i) => ({ text, bold: i === 0 }))
      .filter((l) => l.text)
      .map((l) => {
        doc.setFont('helvetica', l.bold ? 'bold' : 'normal');
        return { bold: l.bold, rows: fitLines(doc, l.text, textW) };
      });
  };
 
  const d = docT();
  const addr = (a) => String(a || '').split('\n').map(s => s.trim()).filter(Boolean);
  const leftLines = measure([
    left.name,
    ...addr(left.address),
    left.gstin ? `${d('doc.gstin')}: ${left.gstin}` : '',
    left.pan ? `${d('doc.pan')}: ${left.pan}` : '',
    left.email ? `${d('doc.email')}: ${left.email}` : '',
    left.phone ? `${d('doc.phone')}: ${left.phone}` : '',
  ]);
  const rightLines = measure([
    right.name,
    right.contact || '',
    ...addr(right.address),
    right.gstin ? `${d('doc.gstin')}: ${right.gstin}` : '',
    right.pan ? `${d('doc.pan')}: ${right.pan}` : '',
    right.email ? `${d('doc.email')}: ${right.email}` : '',
    right.phone ? `${d('doc.phone')}: ${right.phone}` : '',
  ]);
 
  const rowCount = (ls) => ls.reduce((n, l) => n + l.rows.length, 0);
  const rows = Math.max(rowCount(leftLines), rowCount(rightLines));
  // 150 keeps the familiar size for ordinary addresses; taller only if needed.
  const h = Math.max(150, firstLineY + rows * lineH + padBottom);
 
  doc.setFillColor(...PANEL);
  doc.roundedRect(lx, top, panelW, h, 4, 4, 'F');
  doc.roundedRect(rx, top, panelW, h, 4, 4, 'F');
 
  const renderParty = (x, heading, lines) => {
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...FOREST);
    doc.text(heading, x + padX, top + 24);
    doc.setFontSize(9).setTextColor(50);
    let y = top + firstLineY;
    lines.forEach(({ bold, rows: wrapped }) => {
      doc.setFont('helvetica', bold ? 'bold' : 'normal');
      wrapped.forEach((row) => {
        doc.text(row, x + padX, y);
        y += lineH;
      });
    });
  };
 
  renderParty(lx, leftTitle, leftLines);
  renderParty(rx, rightTitle, rightLines);
  return top + h;
}

function drawFooterNote(doc, pageW, s) {
  const d = docT();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(70);
  doc.text(
    d('doc.enquiryFooter', {
      email: s.company_email || 'info@konkuwanherbs.com',
      phone: s.company_phone || '+91 80106 05859',
    }),
    pageW / 2, pageH - 60, { align: 'center' }
  );
  doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(140);
  doc.text(d('doc.electronicNote'), pageW / 2, pageH - 40, { align: 'center' });
}
 
// ── INVOICE ────────────────────────────────────────────────────────────────
export async function downloadInvoice(orderId) {
  const { data } = await apiClient.get(`/admin/orders/${orderId}/invoice`);
  const inv = data.data;
  const d = docT();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const logo = await logoAsPng();

  drawHeader(doc, pageW, {
    title: inv.title || d('doc.invoiceTitle'),
    numberLabel: d('doc.invoiceNo'), numberValue: inv.invoice_number,
    dateLabel: d('doc.invoiceDate'), dateValue: new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
  }, logo);

  // Quotation reference for traceability
  if (inv.quotation_number) {
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(90);
    doc.text(d('doc.quotationRef'), 40, 118);
    doc.setFont('helvetica', 'normal').text(String(inv.quotation_number), 140, 118);
  }

  const partiesBottom = drawParties(doc, pageW, d('doc.billedBy'), inv.company, d('doc.billedTo'), inv.customer, 135);

  autoTable(doc, {
    startY: partiesBottom + 18,
    head: [['#', d('doc.item'), d('doc.gstRate'), d('doc.quantity'), d('doc.rate'), d('doc.amount'), d('doc.igst'), d('doc.total')]],
    body: inv.items.map((it, i) => [
      String(i + 1),
      it.hsn ? `${it.product}  (HSN/SAC: ${it.hsn})` : it.product,
      `${it.gst_rate || 0}%`,
      String(it.quantity),
      inr(it.rate),
      inr(it.amount),
      inr(it.igst),
      inr(it.total),
    ]),
    styles: { fontSize: 9, cellPadding: 6, textColor: [40, 40, 40] },
    headStyles: { fillColor: HEAD, textColor: 255, fontSize: 9 },
    alternateRowStyles: { fillColor: [248, 245, 238] },
    columnStyles: {
      0: { cellWidth: 24 },
      3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' },
      6: { halign: 'right' }, 7: { halign: 'right' },
    },
  });

  let y = doc.lastAutoTable.finalY + 20;
 
  // Total in words (left) + summary box (right)
  doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(40);
  doc.text(`${d('doc.totalInWords')}: ${numberToWords(inv.total)} ${d('doc.rupeesOnly')}`, 40, y + 4, { maxWidth: pageW / 2 - 40 });

  const bx = pageW - 300, bw = 260;
  const rowsSummary = [
    [d('doc.amount'), inr(inv.amount)],
    [`${d('doc.igst')}${inv.tax_percent ? ` (${inv.tax_percent}%)` : ''}`, inr(inv.igst)],
    [d('doc.shippingCharges'), inr(inv.shipping_charges)],
  ];
  doc.setFontSize(10).setTextColor(60);
  rowsSummary.forEach((r, i) => {
    doc.setFont('helvetica', 'bold').text(r[0], bx, y + i * 18);
    doc.setFont('helvetica', 'normal').text(r[1], bx + bw, y + i * 18, { align: 'right' });
  });
  const ty = y + rowsSummary.length * 18 + 4;
  doc.setDrawColor(180).line(bx, ty - 2, bx + bw, ty - 2);
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...FOREST);
  doc.text(d('doc.totalInr'), bx, ty + 12);
  doc.text(inr(inv.total), bx + bw, ty + 12, { align: 'right' });
 
  y = Math.max(ty + 40, y + 60);
 
  // Bank details panel
  if (inv.bank && (inv.bank.account_number || inv.bank.bank_name)) {
    const bh = 108, bwp = 300;
    doc.setFillColor(...PANEL);
    doc.roundedRect(40, y, bwp, bh, 4, 4, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...FOREST);
    doc.text(d('doc.bankDetails'), 54, y + 22);
    const rows = [
      [d('doc.accountHolder'), inv.bank.account_name],
      [d('doc.accountNumber'), inv.bank.account_number],
      [d('doc.ifsc'), inv.bank.ifsc],
      [d('doc.accountType'), inv.bank.account_type],
      [d('doc.bank'), inv.bank.bank_name],
    ];
    doc.setFontSize(9);
    rows.forEach((r, i) => {
      const ry = y + 40 + i * 14;
      doc.setFont('helvetica', 'bold').setTextColor(60).text(r[0], 54, ry);
      doc.setFont('helvetica', 'normal').setTextColor(50).text(String(r[1] || '—'), 180, ry);
    });
    y += bh;
  }
 
  // Terms
  if (inv.terms?.length) {
    y += 24;
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...FOREST);
    doc.text(d('doc.terms'), 40, y);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(60);
    inv.terms.forEach((t, i) => {
      y += 15;
      doc.text(`${i + 1}. ${t}`, 48, y, { maxWidth: pageW - 90 });
    });
  }
 
  drawFooterNote(doc, pageW, { company_email: inv.company.email, company_phone: inv.company.phone });
  doc.save(`${inv.invoice_number.replace(/\//g, '-')}.pdf`);
}
 
// ── QUOTATION ────────────────────────────────────────────────────────────
export async function downloadQuotation(orderId) {
  const { data } = await apiClient.get(`/admin/orders/${orderId}/quotation`);
  const q = data.data;
  const d = docT();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const logo = await logoAsPng();
 
  drawHeader(doc, pageW, {
    title: d('doc.quotationTitle'),
    numberLabel: d('doc.quotationNo'), numberValue: q.quotation_number,
    dateLabel: d('doc.quotationDate'), dateValue: new Date(q.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
  }, logo);

  const partiesBottom = drawParties(doc, pageW, d('doc.quotationFrom'), q.company, d('doc.quotationFor'), q.customer, 135);
 
  autoTable(doc, {
    startY: partiesBottom + 18,
    head: [['#', d('doc.item'), d('doc.quantity'), d('doc.rate'), d('doc.amount')]],
    body: q.items.map((it, i) => [
      String(i + 1), it.product, String(it.quantity), inr(it.rate), inr(it.amount),
    ]),
    styles: { fontSize: 9.5, cellPadding: 7, textColor: [40, 40, 40] },
    headStyles: { fillColor: HEAD, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 245, 238] },
    columnStyles: { 0: { cellWidth: 24 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  });

  let y = doc.lastAutoTable.finalY + 20;
  doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(40);
  doc.text(`${d('doc.totalInWords')}: ${numberToWords(q.total)} ${d('doc.rupeesOnly')}`, 40, y + 4, { maxWidth: pageW / 2 - 40 });

  const bx = pageW - 300, bw = 260;
  doc.setDrawColor(180).line(bx, y - 8, bx + bw, y - 8);
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...FOREST);
  doc.text(d('doc.totalInr'), bx, y + 8);
  doc.text(inr(q.total), bx + bw, y + 8, { align: 'right' });
 
  if (q.terms?.length) {
    y += 48;
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...FOREST);
    doc.text(d('doc.terms'), 40, y);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(60);
    q.terms.forEach((t, i) => {
      y += 15;
      doc.text(`${i + 1}. ${t}`, 48, y, { maxWidth: pageW - 90 });
    });
  }
 
  drawFooterNote(doc, pageW, { company_email: q.company.email, company_phone: q.company.phone });
  doc.save(`${q.quotation_number.replace(/\//g, '-')}.pdf`);
}
 
// ── DELIVERY CHALLAN ─────────────────────────────────────────────────────
// Records a purchase FROM a farmer, so the parties are reversed vs an
// invoice: the company receives, the farmer supplies.
export async function downloadChallan(challanId) {
  const { data } = await apiClient.get(`/admin/challans/${challanId}/print`);
  const c = data.data;
  const d = docT();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const logo = await logoAsPng();
 
  const isTransfer = c.challan_type === 'warehouse_transfer';
 
  drawHeader(doc, pageW, {
    title: isTransfer ? d('doc.transferTitle') : d('doc.challanTitle'),
    numberLabel: d('doc.challanNo'), numberValue: c.challan_number,
    dateLabel: d('doc.challanDate'), dateValue: new Date(c.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
  }, logo);

  // Left panel is where the goods came from, right is where they went.
  // A procurement starts at a farmer, a transfer at a warehouse; both end at
  // the destination warehouse. Challans raised before warehouses existed have
  // no destination, so they fall back to the company as before.
  const from = c.from || {
    name: c.farmer?.name || '—',
    address: c.farmer?.address || c.farmer?.village || '',
    phone: c.farmer?.phone || '',
  };
  const to = c.to || c.company;

  const partiesBottom = drawParties(
    doc, pageW,
    isTransfer ? d('doc.dispatchedFrom') : d('doc.suppliedBy'), from,
    d('doc.dispatchedTo'), to,
    135
  );
 
  autoTable(doc, {
    startY: partiesBottom + 18,
    head: [['#', d('doc.productCrop'), d('doc.quantity'), d('doc.purchaseRate'), d('doc.amount')]],
    body: c.items.map((it, i) => [
      String(i + 1),
      it.product,
      `${it.quantity} ${it.unit}`,
      inr(it.purchase_rate),
      inr(it.line_total),
    ]),
    styles: { fontSize: 9.5, cellPadding: 7, textColor: [40, 40, 40] },
    headStyles: { fillColor: HEAD, textColor: 255 },
    alternateRowStyles: { fillColor: [248, 245, 238] },
    columnStyles: { 0: { cellWidth: 24 }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  });
 
  let y = doc.lastAutoTable.finalY + 20;
 
  doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(40);
  doc.text(`${d('doc.totalInWords')}: ${numberToWords(c.total_value)} ${d('doc.rupeesOnly')}`, 40, y + 4, { maxWidth: pageW / 2 - 40 });
 
  const bx = pageW - 300, bw = 260;
  const rows = [
    [d('doc.goodsValue'), inr(c.goods_value)],
    [d('doc.challanCharges'), inr(c.challan_charges)],
  ];
  doc.setFontSize(10).setTextColor(60);
  rows.forEach((r, i) => {
    doc.setFont('helvetica', 'bold').text(r[0], bx, y + i * 18);
    doc.setFont('helvetica', 'normal').text(r[1], bx + bw, y + i * 18, { align: 'right' });
  });
  const ty = y + rows.length * 18 + 4;
  doc.setDrawColor(180).line(bx, ty - 2, bx + bw, ty - 2);
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...FOREST);
  doc.text(d('doc.totalPurchaseValue'), bx, ty + 12);
  doc.text(inr(c.total_value), bx + bw, ty + 12, { align: 'right' });
 
  y = ty + 44;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90);
  doc.text(isTransfer ? d('doc.transferNote') : d('doc.chargesNote'), 40, y, { maxWidth: pageW - 80 });
 
  if (c.notes) {
    y += 22;
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...FOREST);
    doc.text(d('doc.notes'), 40, y);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(60);
    doc.text(String(c.notes), 40, y + 14, { maxWidth: pageW - 80 });
    y += 30;
  }
 
  // Signature lines — a challan is physically signed on handover
  y += 40;
  doc.setDrawColor(150);
  doc.line(40, y, 200, y);
  doc.line(pageW - 200, y, pageW - 40, y);
  doc.text(isTransfer ? d('doc.dispatchingSignature') : d('doc.farmerSignature'), 40, y + 14);
  doc.text(isTransfer ? d('doc.receivingSignature') : d('doc.authorisedSignatory'), pageW - 200, y + 14);
  doc.text(d('doc.authorisedSignatory'), pageW - 200, y + 14);
 
  // Challan-specific footer (it IS signed, so no "no signature required" note)
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(70);
  doc.text(
    d('doc.enquiryFooter', {
      email: c.company.email || 'info@konkuwanherbs.com',
      phone: c.company.phone || '+91 80106 05859',
    }),
    pageW / 2, pageH - 50, { align: 'center' }
  );
  doc.save(`${c.challan_number.replace(/\//g, '-')}.pdf`);
}