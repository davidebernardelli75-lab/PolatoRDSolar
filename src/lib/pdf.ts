import { jsPDF } from 'jspdf';
import type { Plant, Panel, PanelPhoto } from './types';
import { downloadPhotoBlob } from './api';

const POLATO_BLUE: [number, number, number] = [31, 64, 142];
const POLATO_BLUE_LIGHT: [number, number, number] = [118, 135, 181];
const POLATO_BLUE_PALE: [number, number, number] = [241, 244, 251];
const POLATO_RED: [number, number, number] = [225, 33, 38];
const SLATE_DARK: [number, number, number] = [51, 65, 85];
const SLATE: [number, number, number] = [100, 116, 139];
const WHITE: [number, number, number] = [255, 255, 255];
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 15;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface PreparedPhoto {
  dataUrl: string;
  format: 'JPEG' | 'PNG';
  width: number;
  height: number;
}

type PhotoLoader = (storagePath: string) => Promise<Blob>;

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function blobToRawImage(blob: Blob): Promise<PreparedPhoto> {
  const mimeType = blob.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return {
    dataUrl: `data:${mimeType};base64,${arrayBufferToBase64(await blob.arrayBuffer())}`,
    format: mimeType === 'image/png' ? 'PNG' : 'JPEG',
    width: 1,
    height: 1,
  };
}

async function preparePhoto(blob: Blob): Promise<PreparedPhoto> {
  if (typeof document === 'undefined' || typeof Image === 'undefined') {
    return blobToRawImage(blob);
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => reject(new Error('Immagine non leggibile'));
      element.src = objectUrl;
    });

    const maxWidth = 1600;
    const maxHeight = 1100;
    const scale = Math.min(1, maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas non disponibile');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    canvas.width = 1;
    canvas.height = 1;
    image.src = '';
    return { dataUrl, format: 'JPEG', width, height };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function loadLogoDataUrl(): Promise<string | null> {
  try {
    const response = await fetch('/assets/images/Polato_R&D.png', { cache: 'force-cache' });
    if (!response.ok) return null;
    const mimeType = response.headers.get('content-type') || 'image/png';
    return `data:${mimeType};base64,${arrayBufferToBase64(await response.arrayBuffer())}`;
  } catch {
    return null;
  }
}

function addContainedLogo(
  doc: jsPDF,
  logoDataUrl: string,
  x: number,
  y: number,
  maxWidth: number,
  maxHeight: number
): void {
  const properties = doc.getImageProperties(logoDataUrl);
  const ratio = properties.width / properties.height;
  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  doc.addImage(
    logoDataUrl,
    'PNG',
    x + (maxWidth - width) / 2,
    y + (maxHeight - height) / 2,
    width,
    height
  );
}

function addMainHeader(doc: jsPDF, logoDataUrl: string | null): void {
  doc.setFillColor(...POLATO_BLUE);
  doc.rect(0, 0, PAGE_W, 35, 'F');
  doc.setFillColor(...POLATO_RED);
  doc.rect(0, 35, PAGE_W, 1.5, 'F');

  if (logoDataUrl) {
    doc.setFillColor(...WHITE);
    doc.roundedRect(MARGIN, 5.5, 43, 24, 2, 2, 'F');
    addContainedLogo(doc, logoDataUrl, MARGIN + 2, 7, 39, 21);
  } else {
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('POLATO R&D', MARGIN, 17);
  }

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('RELAZIONE TECNICA', MARGIN + 50, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(227, 232, 245);
  doc.text('Impianto solare', MARGIN + 50, 21.5);
  doc.setFontSize(8);
  doc.text(`Generato: ${new Date().toLocaleDateString('it-IT')}`, PAGE_W - MARGIN, 28, {
    align: 'right',
  });
}

function addCompactHeader(doc: jsPDF, logoDataUrl: string | null, title: string): number {
  doc.setFillColor(...POLATO_BLUE);
  doc.rect(0, 0, PAGE_W, 20, 'F');
  doc.setFillColor(...POLATO_RED);
  doc.rect(0, 20, PAGE_W, 1.2, 'F');
  if (logoDataUrl) {
    doc.setFillColor(...WHITE);
    doc.roundedRect(MARGIN, 3, 31, 14, 1.5, 1.5, 'F');
    addContainedLogo(doc, logoDataUrl, MARGIN + 1, 4, 29, 12);
  }
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, PAGE_W - MARGIN, 12.5, { align: 'right' });
  return 29;
}

function addSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setTextColor(...POLATO_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(title, MARGIN, y);
  doc.setDrawColor(...POLATO_RED);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y + 2, PAGE_W - MARGIN, y + 2);
  return y + 8;
}

function addRows(doc: jsPDF, rows: Array<[string, string]>, startY: number): number {
  let y = startY;
  doc.setFontSize(8.5);
  rows.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...SLATE_DARK);
    doc.text(label, MARGIN, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...SLATE);
    const wrapped = doc.splitTextToSize(value, CONTENT_W - 55);
    doc.text(wrapped, MARGIN + 55, y);
    y += Math.max(5.2, wrapped.length * 3.8 + 1.2);
  });
  return y;
}

function addPanelTableHeader(doc: jsPDF, y: number): number {
  const colX = [MARGIN, MARGIN + 12, MARGIN + 82, MARGIN + 132];
  doc.setFillColor(...POLATO_BLUE);
  doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('#', colX[0] + 2, y + 5);
  doc.text('Matricola / Barcode', colX[1] + 2, y + 5);
  doc.text('Posizione', colX[2] + 2, y + 5);
  doc.text('Note', colX[3] + 2, y + 5);
  return y + 7;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'N/D';
  return dateStr.slice(0, 10);
}

function orNa(value: string | null | undefined | number): string {
  if (value == null || value === '') return 'N/D';
  return String(value);
}

function addPhotoCard(
  doc: jsPDF,
  prepared: PreparedPhoto,
  photo: PanelPhoto,
  panelSerial: string | null,
  y: number
): void {
  const x = MARGIN;
  const cardW = CONTENT_W;
  const cardH = 112;
  const imageX = x + 4;
  const imageY = y + 4;
  const imageMaxW = cardW - 8;
  const imageMaxH = 88;
  const ratio = prepared.width / prepared.height;
  let imageW = imageMaxW;
  let imageH = imageW / ratio;
  if (!Number.isFinite(ratio) || ratio <= 0) {
    imageW = imageMaxW;
    imageH = imageMaxH;
  } else if (imageH > imageMaxH) {
    imageH = imageMaxH;
    imageW = imageH * ratio;
  }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(...POLATO_BLUE_LIGHT);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');
  doc.addImage(
    prepared.dataUrl,
    prepared.format,
    imageX + (imageMaxW - imageW) / 2,
    imageY + (imageMaxH - imageH) / 2,
    imageW,
    imageH
  );

  doc.setTextColor(...SLATE_DARK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const caption = panelSerial ? `Pannello: ${panelSerial}` : 'Foto generale impianto';
  doc.text(doc.splitTextToSize(caption, 105)[0] ?? caption, x + 4, y + 98);
  doc.setTextColor(...SLATE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text(doc.splitTextToSize(photo.file_name, 105)[0] ?? photo.file_name, x + 4, y + 104);
  doc.text(formatDate(photo.created_at), x + cardW - 4, y + 104, { align: 'right' });
}

function addFooters(doc: jsPDF): void {
  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    const footerY = PAGE_H - 12;
    doc.setDrawColor(...POLATO_RED);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, footerY - 2, PAGE_W - MARGIN, footerY - 2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...SLATE);
    doc.text('POLATO R&D - Documento generato automaticamente', MARGIN, footerY);
    doc.text(`Pagina ${page} di ${totalPages}`, PAGE_W - MARGIN, footerY, { align: 'right' });
  }
}

export async function generatePlantPdf(
  plant: Plant,
  panels: Panel[],
  photos: PanelPhoto[] = [],
  photoLoader: PhotoLoader = downloadPhotoBlob
): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoDataUrl = await loadLogoDataUrl();
  addMainHeader(doc, logoDataUrl);
  let y = 44;

  y = addSectionTitle(doc, 'DATI PROPRIETARIO', y);
  y = addRows(doc, [
    ['Tipo', plant.owner_type],
    [plant.owner_type === 'Azienda' ? 'Ragione Sociale' : 'Nome Proprietario', plant.owner_name],
    ['Codice Fiscale / P.IVA', orNa(plant.fiscal_or_vat)],
    ['Indirizzo', plant.address],
    ['Città / Paese', orNa(plant.city)],
    ['Provincia', orNa(plant.province)],
    ['Regione', orNa(plant.region)],
    ['Telefono', orNa(plant.phone)],
    ['Email', orNa(plant.email)],
  ], y);

  y = addSectionTitle(doc, 'DATI TECNICI IMPIANTO', y + 3);
  y = addRows(doc, [
    ['POD', orNa(plant.pod)],
    ['Codice CENSIMP', orNa(plant.censimp_code)],
    ['Potenza Totale', plant.total_power_kw != null ? `${plant.total_power_kw} kW` : 'N/D'],
    ['Marca/Modello Pannelli', orNa(plant.panel_brand_model)],
    ['Marca/Modello Inverter', orNa(plant.inverter_brand_model)],
    ['Accumulo - Potenza', plant.storage_power_kw != null ? `${plant.storage_power_kw} kW` : 'N/D'],
    ['Accumulo - Marca', orNa(plant.storage_brand)],
    ['Accumulo - Modello', orNa(plant.storage_model)],
    ['Data Installazione', formatDate(plant.installation_date)],
    ['Note', orNa(plant.notes)],
  ], y);

  if (y > PAGE_H - 45) {
    doc.addPage();
    y = addCompactHeader(doc, logoDataUrl, 'PANNELLI REGISTRATI');
  }
  y = addSectionTitle(doc, 'PANNELLI REGISTRATI', y + 4);
  y = addPanelTableHeader(doc, y);

  if (panels.length === 0) {
    doc.setFillColor(...POLATO_BLUE_PALE);
    doc.setDrawColor(...POLATO_BLUE_LIGHT);
    doc.rect(MARGIN, y, CONTENT_W, 8, 'FD');
    doc.setTextColor(...SLATE);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Nessun pannello registrato.', MARGIN + 2, y + 5);
  } else {
    const colX = [MARGIN, MARGIN + 12, MARGIN + 82, MARGIN + 132];
    panels.forEach((panel, index) => {
      if (y > PAGE_H - 25) {
        doc.addPage();
        y = addCompactHeader(doc, logoDataUrl, 'PANNELLI REGISTRATI');
        y = addSectionTitle(doc, 'ELENCO PANNELLI - CONTINUA', y);
        y = addPanelTableHeader(doc, y);
      }

      doc.setFillColor(...(index % 2 === 0 ? POLATO_BLUE_PALE : WHITE));
      doc.setDrawColor(218, 225, 238);
      doc.rect(MARGIN, y, CONTENT_W, 7, 'FD');
      doc.setTextColor(...SLATE_DARK);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(String(index + 1), colX[0] + 2, y + 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.text(doc.splitTextToSize(panel.serial_number, 66)[0] ?? '', colX[1] + 2, y + 5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(doc.splitTextToSize(panel.position_label ?? 'N/D', 46)[0] ?? '', colX[2] + 2, y + 5);
      doc.text(doc.splitTextToSize(panel.notes ?? '', 44)[0] ?? '', colX[3] + 2, y + 5);
      y += 7;
    });
  }

  const panelMap = new Map(panels.map((panel) => [panel.id, panel.serial_number]));
  let includedPhotos = 0;
  for (const photo of photos) {
    try {
      const prepared = await preparePhoto(await photoLoader(photo.storage_path));
      if (includedPhotos % 2 === 0) {
        doc.addPage();
        addCompactHeader(doc, logoDataUrl, 'ALLEGATO FOTOGRAFICO');
      }
      const cardY = includedPhotos % 2 === 0 ? 30 : 148;
      addPhotoCard(
        doc,
        prepared,
        photo,
        photo.panel_id ? panelMap.get(photo.panel_id) ?? null : null,
        cardY
      );
      includedPhotos += 1;
    } catch (error) {
      console.error(`Impossibile inserire la foto ${photo.file_name} nel PDF:`, error);
    }
  }

  addFooters(doc);
  return doc.output('blob');
}
