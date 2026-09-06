import { jsPDF } from 'jspdf';
import type { Plant, Panel } from './types';

const POLATO_BLUE: [number, number, number] = [30, 64, 145];
const POLATO_BLUE_LIGHT: [number, number, number] = [91, 119, 190];
const POLATO_RED: [number, number, number] = [229, 35, 41];
const SLATE_DARK: [number, number, number] = [51, 65, 85];
const SLATE: [number, number, number] = [100, 116, 139];
const SLATE_LIGHT: [number, number, number] = [241, 245, 249];
const WHITE: [number, number, number] = [255, 255, 255];

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch('/assets/images/Polato_R&D.png');
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/D';
  return dateStr.slice(0, 10);
}

function orNa(value: string | null | undefined | number): string {
  if (value == null || value === '') return 'N/D';
  return String(value);
}

export async function generatePlantPdf(plant: Plant, panels: Panel[]): Promise<Blob> {
  const [doc, logoDataUrl] = [new jsPDF({ unit: 'mm', format: 'a4' }), await loadLogoDataUrl()];
  const pageW = 210;
  const pageH = 297;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 0;

  // ── Header band (navy) ──────────────────────────────────────────
  doc.setFillColor(...POLATO_BLUE);
  doc.rect(0, 0, pageW, 35, 'F');

  // Polato red accent stripe
  doc.setFillColor(...POLATO_RED);
  doc.rect(0, 35, pageW, 1.5, 'F');

  // Official logo
  if (logoDataUrl) {
    doc.setFillColor(...WHITE);
    doc.roundedRect(margin, 5, 30, 25, 2, 2, 'F');
    doc.addImage(logoDataUrl, 'PNG', margin + 1, 6, 28, 23);
  }

  // Company name
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('POLATO R&D', margin + 36, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(220, 228, 245);
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
  doc.setTextColor(...POLATO_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DATI PROPRIETARIO', margin, y);
  y += 2;

  doc.setDrawColor(...POLATO_RED);
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
  doc.setTextColor(...POLATO_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('DATI TECNICI IMPIANTO', margin, y);
  y += 2;

  doc.setDrawColor(...POLATO_RED);
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
  doc.setTextColor(...POLATO_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('PANNELLI REGISTRATI', margin, y);
  y += 2;

  doc.setDrawColor(...POLATO_RED);
  doc.line(margin, y, pageW - margin, y);
  y += 5;

  // Table header
  const colN = 12;
  const colSerial = 70;
  const colPos = 50;
  const colNotes = contentW - colN - colSerial - colPos;
  const colX = [margin, margin + colN, margin + colN + colSerial, margin + colN + colSerial + colPos];

  doc.setFillColor(...POLATO_BLUE);
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
  doc.setDrawColor(...POLATO_BLUE_LIGHT);
  doc.setLineWidth(0.3);
  doc.rect(margin, y - panels.length * 7 - (panels.length === 0 ? 8 : 0) - 7, contentW, panels.length * 7 + (panels.length === 0 ? 8 : 0) + 7);

  // ── Footer ───────────────────────────────────────────────────────
  const footerY = pageH - 12;
  doc.setDrawColor(...POLATO_RED);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 2, pageW - margin, footerY - 2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...SLATE);
  doc.text('POLATO R&D - Documento generato automaticamente', margin, footerY);
  doc.text(`Pagina 1`, pageW - margin, footerY, { align: 'right' });

  return doc.output('blob');
}
