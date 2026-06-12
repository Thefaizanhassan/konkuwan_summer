import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import apiClient from '../services/api';
import logoUrl from '../assets/konkuwan_logo_primary.svg';

// Rasterize the SVG logo to PNG via canvas (jsPDF can't embed SVG directly).
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
    canvas.width = 600; canvas.height = 156; // matches 300x78 viewBox @2x
    canvas.getContext('2d').drawImage(img, 0, 0, 600, 156);
    URL.revokeObjectURL(url);
    return canvas.toDataURL('image/png');
  } catch {
    return null; // fall back to text header
  }
}

const inr = (n) => `Rs ${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;

export async function downloadInvoice(orderId) {
  const { data } = await apiClient.get(`/admin/orders/${orderId}/invoice`);
  const inv = data.data;

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const FOREST = [22, 47, 34];

  // ── Header ──
  const logo = await logoAsPng();
  if (logo) {
    doc.addImage(logo, 'PNG', 40, 32, 150, 39);
  } else {
    doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(...FOREST);
    doc.text('KONKUWAN HERBS', 40, 56);
  }
  doc.setFont('helvetica', 'bold').setFontSize(22).setTextColor(...FOREST);
  doc.text('INVOICE', pageW - 40, 56, { align: 'right' });

  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(110);
  doc.text(
    ['Konkuwan Herbs Pvt. Ltd.', 'Baseli Sahi, Puri, Odisha 752001',
     'CIN: U01400OR2018PTC029698 · GSTIN on request', 'info@konkuwanherbs.com · +91 8809 227099'],
    40, 86
  );

  // ── Invoice meta + Bill To ──
  doc.setFontSize(10).setTextColor(60);
  doc.text(
    [`Invoice No: ${inv.invoice_number}`,
     `Date: ${new Date(inv.date).toLocaleDateString('en-IN')}`,
     `Due: ${new Date(inv.due_date).toLocaleDateString('en-IN')}`,
     `Status: ${inv.status}`],
    pageW - 40, 86, { align: 'right' }
  );

  doc.setFont('helvetica', 'bold').setTextColor(...FOREST);
  doc.text('Bill To', 40, 160);
  doc.setFont('helvetica', 'normal').setTextColor(60);
  doc.text(
    [inv.customer.name || '—',
     inv.customer.contact || '',
     inv.customer.address || '',
     inv.customer.gstin ? `GSTIN: ${inv.customer.gstin}` : '',
     inv.customer.email || ''].filter(Boolean),
    40, 176
  );

  // ── Line items ──
  autoTable(doc, {
    startY: 250,
    head: [['Product', 'Qty', 'Unit', 'Unit Price', 'Line Total']],
    body: inv.items.map(it => [
      it.product,
      String(it.quantity),
      it.unit,
      inr(it.final_price ?? it.unit_price),
      inr(it.line_total),
    ]),
    styles: { fontSize: 10, cellPadding: 6 },
    headStyles: { fillColor: FOREST, textColor: 255 },
    alternateRowStyles: { fillColor: [244, 239, 230] }, // cream
    columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' } },
  });

  // ── Totals ──
  const y = doc.lastAutoTable.finalY + 24;
  doc.setFontSize(10).setTextColor(60);
  doc.text(`Subtotal: ${inr(inv.subtotal)}`, pageW - 40, y, { align: 'right' });
  doc.text(`Tax (GST): ${inr(inv.tax)}`, pageW - 40, y + 16, { align: 'right' });
  doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...FOREST);
  doc.text(`Total: ${inr(inv.total)}`, pageW - 40, y + 38, { align: 'right' });

  doc.setFont('helvetica', 'italic').setFontSize(9).setTextColor(140);
  doc.text('Regenerating land. Transforming lives.', 40, doc.internal.pageSize.getHeight() - 40);

  doc.save(`${inv.invoice_number}.pdf`);
}