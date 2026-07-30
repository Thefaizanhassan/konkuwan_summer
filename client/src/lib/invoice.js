import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiClient from '../services/api';
import logoUrl from '../assets/konkuwan_logo_primary.svg';

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
 
// Shared two-panel block: "From/Billed By" | "To/Billed For"
function drawParties(doc, pageW, leftTitle, left, rightTitle, right, top) {
  const gap = 16, panelW = (pageW - 80 - gap) / 2;
  const lx = 40, rx = 40 + panelW + gap;
  const h = 150;
  doc.setFillColor(...PANEL);
  doc.roundedRect(lx, top, panelW, h, 4, 4, 'F');
  doc.roundedRect(rx, top, panelW, h, 4, 4, 'F');
 
  const renderParty = (x, heading, lines) => {
    doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...FOREST);
    doc.text(heading, x + 14, top + 24);
    doc.setFontSize(9).setTextColor(50);
    let y = top + 42;
    lines.forEach((ln, i) => {
      if (!ln) return;
      doc.setFont('helvetica', i === 0 ? 'bold' : 'normal');
      // support "Label: value" bold-label lines
      doc.text(ln, x + 14, y);
      y += 14;
    });
  };
 
  const addr = (a) => (a || '').split('\n').map(s => s.trim()).filter(Boolean);
  renderParty(lx, leftTitle, [
    left.name,
    ...addr(left.address),
    left.gstin ? `GSTIN: ${left.gstin}` : '',
    left.pan ? `PAN: ${left.pan}` : '',
    left.email ? `Email: ${left.email}` : '',
    left.phone ? `Phone: ${left.phone}` : '',
  ]);
  renderParty(rx, rightTitle, [
    right.name,
    right.contact || '',
    ...addr(right.address),
    right.gstin ? `GSTIN: ${right.gstin}` : '',
    right.pan ? `PAN: ${right.pan}` : '',
    right.email ? `Email: ${right.email}` : '',
    right.phone ? `Phone: ${right.phone}` : '',
  ]);
  return top + h;
}

function drawFooterNote(doc, pageW, s) {
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(70);
  doc.text(
    `For any enquiry, reach out via email at ${s.company_email || 'info@konkuwanherbs.com'}, call on ${s.company_phone || '+91 80106 05859'}`,
    pageW / 2, pageH - 60, { align: 'center' }
  );
  doc.setFont('helvetica', 'italic').setFontSize(8).setTextColor(140);
  doc.text('This is an electronically generated document, no signature is required.', pageW / 2, pageH - 40, { align: 'center' });
}
 
// ── INVOICE ────────────────────────────────────────────────────────────────
export async function downloadInvoice(orderId) {
  const { data } = await apiClient.get(`/admin/orders/${orderId}/invoice`);
  const inv = data.data;
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const logo = await logoAsPng();

  drawHeader(doc, pageW, {
    title: inv.title || 'GST Invoice',
    numberLabel: 'Invoice No #', numberValue: inv.invoice_number,
    dateLabel: 'Invoice Date', dateValue: new Date(inv.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
  }, logo);

  // Quotation reference for traceability
  if (inv.quotation_number) {
    doc.setFont('helvetica', 'bold').setFontSize(9.5).setTextColor(90);
    doc.text('Quotation Ref', 40, 118);
    doc.setFont('helvetica', 'normal').text(String(inv.quotation_number), 140, 118);
  }

  const partiesBottom = drawParties(doc, pageW, 'Billed By', inv.company, 'Billed To', inv.customer, 135);

  autoTable(doc, {
    startY: partiesBottom + 18,
    head: [['#', 'Item', 'GST Rate', 'Quantity', 'Rate', 'Amount', 'IGST', 'Total']],
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
  doc.text(`Total (in words): ${numberToWords(inv.total)} RUPEES ONLY`, 40, y + 4, { maxWidth: pageW / 2 - 40 });
 
  const bx = pageW - 300, bw = 260;
  const rowsSummary = [
    ['Amount', inr(inv.amount)],
    [`IGST${inv.tax_percent ? ` (${inv.tax_percent}%)` : ''}`, inr(inv.igst)],
    ['Shipping Charges', inr(inv.shipping_charges)],
  ];
  doc.setFontSize(10).setTextColor(60);
  rowsSummary.forEach((r, i) => {
    doc.setFont('helvetica', 'bold').text(r[0], bx, y + i * 18);
    doc.setFont('helvetica', 'normal').text(r[1], bx + bw, y + i * 18, { align: 'right' });
  });
  const ty = y + rowsSummary.length * 18 + 4;
  doc.setDrawColor(180).line(bx, ty - 2, bx + bw, ty - 2);
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...FOREST);
  doc.text('Total (INR)', bx, ty + 12);
  doc.text(inr(inv.total), bx + bw, ty + 12, { align: 'right' });
 
  y = Math.max(ty + 40, y + 60);
 
  // Bank details panel
  if (inv.bank && (inv.bank.account_number || inv.bank.bank_name)) {
    const bh = 108, bwp = 300;
    doc.setFillColor(...PANEL);
    doc.roundedRect(40, y, bwp, bh, 4, 4, 'F');
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...FOREST);
    doc.text('Bank Details', 54, y + 22);
    const rows = [
      ['Account Holder Name', inv.bank.account_name],
      ['Account Number', inv.bank.account_number],
      ['IFSC', inv.bank.ifsc],
      ['Account Type', inv.bank.account_type],
      ['Bank', inv.bank.bank_name],
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
    doc.text('Terms and Conditions', 40, y);
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
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const logo = await logoAsPng();
 
  drawHeader(doc, pageW, {
    title: 'Quotation',
    numberLabel: 'Quotation No #', numberValue: q.quotation_number,
    dateLabel: 'Quotation Date', dateValue: new Date(q.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
  }, logo);
 
  const partiesBottom = drawParties(doc, pageW, 'Quotation From', q.company, 'Quotation For', q.customer, 135);
 
  autoTable(doc, {
    startY: partiesBottom + 18,
    head: [['#', 'Item', 'Quantity', 'Rate', 'Amount']],
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
  doc.text(`Total (in words): ${numberToWords(q.total)} RUPEES ONLY`, 40, y + 4, { maxWidth: pageW / 2 - 40 });

  const bx = pageW - 300, bw = 260;
  doc.setDrawColor(180).line(bx, y - 8, bx + bw, y - 8);
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...FOREST);
  doc.text('Total (INR)', bx, y + 8);
  doc.text(inr(q.total), bx + bw, y + 8, { align: 'right' });
 
  if (q.terms?.length) {
    y += 48;
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...FOREST);
    doc.text('Terms and Conditions', 40, y);
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
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const logo = await logoAsPng();
 
  drawHeader(doc, pageW, {
    title: 'Delivery Challan',
    numberLabel: 'Challan No #', numberValue: c.challan_number,
    dateLabel: 'Challan Date', dateValue: new Date(c.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }),
  }, logo);
 
  const partiesBottom = drawParties(
    doc, pageW,
    'Received By', c.company,
    'Supplied By (Farmer)', {
      name: c.farmer.name,
      address: c.farmer.village,
      phone: c.farmer.phone,
    },
    135
  );
 
  autoTable(doc, {
    startY: partiesBottom + 18,
    head: [['#', 'Product / Crop', 'Quantity', 'Purchase Rate', 'Amount']],
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
  doc.text(`Total (in words): ${numberToWords(c.total_value)} RUPEES ONLY`, 40, y + 4, { maxWidth: pageW / 2 - 40 });
 
  const bx = pageW - 300, bw = 260;
  const rows = [
    ['Goods Value', inr(c.goods_value)],
    ['Challan Charges', inr(c.challan_charges)],
  ];
  doc.setFontSize(10).setTextColor(60);
  rows.forEach((r, i) => {
    doc.setFont('helvetica', 'bold').text(r[0], bx, y + i * 18);
    doc.setFont('helvetica', 'normal').text(r[1], bx + bw, y + i * 18, { align: 'right' });
  });
  const ty = y + rows.length * 18 + 4;
  doc.setDrawColor(180).line(bx, ty - 2, bx + bw, ty - 2);
  doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...FOREST);
  doc.text('Total Purchase Value', bx, ty + 12);
  doc.text(inr(c.total_value), bx + bw, ty + 12, { align: 'right' });
 
  y = ty + 44;
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90);
  doc.text('Challan charges cover crop pickup, transportation to warehouse, loading/unloading and other procurement costs.', 40, y, { maxWidth: pageW - 80 });
 
  if (c.notes) {
    y += 22;
    doc.setFont('helvetica', 'bold').setFontSize(10).setTextColor(...FOREST);
    doc.text('Notes', 40, y);
    doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(60);
    doc.text(String(c.notes), 40, y + 14, { maxWidth: pageW - 80 });
    y += 30;
  }
 
  // Signature lines — a challan is physically signed on handover
  y += 40;
  doc.setDrawColor(150);
  doc.line(40, y, 200, y);
  doc.line(pageW - 200, y, pageW - 40, y);
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(90);
  doc.text('Farmer / Supplier Signature', 40, y + 14);
  doc.text('Authorised Signatory', pageW - 200, y + 14);
 
  // Challan-specific footer (it IS signed, so no "no signature required" note)
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(70);
  doc.text(
    `For any enquiry, reach out via email at ${c.company.email || 'info@konkuwanherbs.com'}, call on ${c.company.phone || '+91 80106 05859'}`,
    pageW / 2, pageH - 50, { align: 'center' }
  );
  doc.save(`${c.challan_number.replace(/\//g, '-')}.pdf`);
}