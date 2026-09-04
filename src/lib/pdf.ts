import { jsPDF } from 'jspdf';
import type { Plant, Panel } from './types';

const NAVY: [number, number, number] = [26, 35, 126];
const NAVY_LIGHT: [number, number, number] = [59, 76, 202];
const YELLOW: [number, number, number] = [250, 204, 21];
const YELLOW_DARK: [number, number, number] = [202, 138, 4];
const SLATE_DARK: [number, number, number] = [51, 65, 85];
const SLATE: [number, number, number] = [100, 116, 139];
const SLATE_LIGHT: [number, number, number] = [241, 245, 249];
const WHITE: [number, number, number] = [255, 255, 255];

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/D';
  return dateStr.slice(0, 10);
}

function orNa(value: string | null | undefined | number): string {
  if (value == null || value === '') return 'N/D';
  return String(value);
}

export function generatePlantPdf(plant: Plant, panels: Panel[]): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Header band (navy) ──────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageW, 35, 'F');

  // Yellow accent stripe
  doc.setFillColor(...YELLOW);
  doc.rect(0, 35, pageW, 1.5, 'F');

  // Logo box (yellow square with "P&R")
  doc.setFillColor(...YELLOW);
  doc.roundedRect(margin, 8, 18, 18, 2, 2, 'F');
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('P&R', margin + 9, 18, { align: 'center' });

  // Company name
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('POLATO R&D', margin + 24, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 210, 240);
  doc.text('Relazione Tecnica Impianto Solare', margin + 24, 23);

  // Export date (right side)
  doc.setFontSize(8);
  doc.text(
    `Generato: ${new Date().toLocaleDateString('it-IT')}`,
    pageW - margin,
    16,
    { align: 'right' }
  );

  y = 44;

  // ── Owner section ────────────────────────────────────────────────
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DATI PROPRIETARIO', margin, y);
  y += 2;

  doc.setDrawColor(...YELLOW);
  doc.setLineWidth(0.6);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  const ownerRows: [string, string][] = [
    ['Tipo', plant.owner_type],
    [plant.owner_type === 'Azienda' ? 'Ragione Sociale' : 'Nome Proprietario', plant.owner_name],
    ['Codice Fiscale / P.IVA', orNa(plant.fiscal_or_vat)],
    ['Indirizzo', plant.address],
    ['Telefono', orNa(plant.phone)],
    ['Email', orNa(plant.email)],
  ];

  doc.setFontSize(9);
  ownerRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SLATE_DARK);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE);
    const wrapped = doc.splitTextToSize(value, contentW - 50);
    doc.text(wrapped, margin + 50, y);
    y += 6;
  });

  y += 4;

  // ── Technical specs section ─────────────────────────────────────
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DATI TECNICI IMPIANTO', margin, y);
  y += 2;

  doc.setDrawColor(...YELLOW);
  doc.line(margin, y, pageW - margin, y);
  y += 6;

  const techRows: [string, string][] = [
    ['Potenza Totale', plant.total_power_kw != null ? `${plant.total_power_kw} kW` : 'N/D'],
    ['Marca/Modello Pannelli', orNa(plant.panel_brand_model)],
    ['Marca/Modello Inverter', orNa(plant.inverter_brand_model)],
    ['Data Installazione', formatDate(plant.installation_date)],
    ['Note', orNa(plant.notes)],
  ];

  doc.setFontSize(9);
  techRows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SLATE_DARK);
    doc.text(label, margin, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE);
    const wrapped = doc.splitTextToSize(value, contentW - 55);
    doc.text(wrapped, margin + 55, y);
    y += 6;
  });

  y += 6;

  // ── Panels table ─────────────────────────────────────────────────
  doc.setTextColor(...NAVY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PANNELLI REGISTRATI', margin, y);
  y += 2;

  doc.setDrawColor(...YELLOW);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // Table header
  const colN = 12;
  const colSerial = 70;
  const colPos = 50;
  const colNotes = contentW - colN - colSerial - colPos;
  const colX = [margin, margin + colN, margin + colN + colSerial, margin + colN + colSerial + colPos];

  doc.setFillColor(...NAVY);
  doc.rect(margin, y, contentW, 7, 'F');

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('#', colX[0] + 2, y + 5);
  doc.text('Matricola / Barcode', colX[1] + 2, y + 5);
  doc.text('Posizione', colX[2] + 2, y + 5);
  doc.text('Note', colX[3] + 2, y + 5);
  y += 7;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  if (panels.length === 0) {
    doc.setFillColor(...SLATE_LIGHT);
    doc.rect(margin, y, contentW, 8, 'F');
    doc.setTextColor(...SLATE);
    doc.text('Nessun pannello registrato.', margin + 2, y + 5);
    y += 8;
  } else {
    panels.forEach((panel, i) => {
      // Check page break
      if (y > pageH - 30) {
        doc.addPage();
        y = margin;
      }

      // Alternate row background
      if (i % 2 === 0) {
        doc.setFillColor(...SLATE_LIGHT);
        doc.rect(margin, y, contentW, 7, 'F');
      }

      doc.setTextColor(...SLATE_DARK);
      doc.text(String(i + 1), colX[0] + 2, y + 5);
      doc.setTextColor(...SLATE);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      const serialWrapped = doc.splitTextToSize(panel.serial_number, colSerial - 4);
      doc.text(serialWrapped[0] ?? '', colX[1] + 2, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const posWrapped = doc.splitTextToSize(panel.position_label ?? 'N/D', colPos - 4);
      doc.text(posWrapped[0] ?? '', colX[2] + 2, y + 5);
      const notesWrapped = doc.splitTextToSize(panel.notes ?? '', colNotes - 4);
      doc.text(notesWrapped[0] ?? '', colX[3] + 2, y + 5);

      y += 7;
    });
  }

  // Table border
  doc.setDrawColor(...NAVY_LIGHT);
  doc.setLineWidth(0.3);
  doc.rect(margin, y - panels.length * 7 - (panels.length === 0 ? 8 : 0) - 7, contentW, panels.length * 7 + (panels.length === 0 ? 8 : 0) + 7);

  // ── Footer ───────────────────────────────────────────────────────
  const footerY = pageH - 12;
  doc.setDrawColor(...YELLOW);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 2, pageW - margin, footerY - 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  doc.text('POLATO R&D - Documento generato automaticamente', margin, footerY);
  doc.text(`Pagina 1`, pageW - margin, footerY, { align: 'right' });

  return doc.output('blob');
}
