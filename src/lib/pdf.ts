import { jsPDF } from 'jspdf';
import type {
  Plant,
  Panel,
  PanelPhoto,
  PlantInverter,
  PlantStorage,
  PlantCharger,
  Vehicle,
  Insurance,
  QuoteRequest,
  WorkReport,
  WorkReportMaterial,
  WorkReportWorker,
  WorkSite,
  WorkSitePhase,
} from './types';
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

const PDF_MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

function formatMonthYear(dateStr: string | null): string {
  if (!dateStr) return 'N/D';
  const parts = dateStr.slice(0, 10).split('-');
  if (parts.length < 2) return 'N/D';
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return 'N/D';
  return `${PDF_MONTHS[monthIdx]} ${parts[0]}`;
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
  x: number,
  y: number,
  cardW: number,
  cardH: number
): void {
  const imageX = x + 3;
  const imageY = y + 3;
  const imageMaxW = cardW - 6;
  const imageMaxH = cardH - 22;
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
  doc.setFontSize(7);
  const caption = panelSerial ? `Pannello: ${panelSerial}` : 'Foto generale impianto';
  doc.text(doc.splitTextToSize(caption, cardW - 6)[0] ?? caption, x + 3, y + cardH - 12);
  doc.setTextColor(...SLATE);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(
    doc.splitTextToSize(photo.file_name, cardW - 29)[0] ?? photo.file_name,
    x + 3,
    y + cardH - 5
  );
  doc.text(formatDate(photo.created_at), x + cardW - 3, y + cardH - 5, { align: 'right' });
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
  photoLoader: PhotoLoader = downloadPhotoBlob,
  inverters: PlantInverter[] = [],
  storages: PlantStorage[] = [],
  chargers: PlantCharger[] = [],
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
    ['Potenza Totale', plant.total_power_kw != null ? `${plant.total_power_kw} kWh` : 'N/D'],
    ['Marca/Modello Pannelli', orNa(plant.panel_brand_model)],
    ['Colonnina - Marca', orNa(plant.charger_brand)],
    ['Colonnina - Modello', orNa(plant.charger_model)],
    ['Colonnina - Codice', orNa(plant.charger_code)],
    ['Data Installazione', formatDate(plant.installation_date)],
    ['Note', orNa(plant.notes)],
  ], y);

  if (inverters.length > 0) {
    y = addSectionTitle(doc, 'INVERTER', y + 3);
    inverters.forEach((inv, i) => {
      y = addRows(doc, [
        [`Inverter ${i + 1} - Marca`, orNa(inv.brand)],
        [`Inverter ${i + 1} - Modello`, orNa(inv.model)],
        [`Inverter ${i + 1} - Codice`, orNa(inv.code)],
      ], y);
    });
  }

  if (storages.length > 0) {
    y = addSectionTitle(doc, 'SISTEMI DI ACCUMULO', y + 3);
    storages.forEach((sto, i) => {
      y = addRows(doc, [
        [`Accumulo ${i + 1} - Marca`, orNa(sto.brand)],
        [`Accumulo ${i + 1} - Modello`, orNa(sto.model)],
        [`Accumulo ${i + 1} - Codice`, orNa(sto.code)],
        [`Accumulo ${i + 1} - Potenza`, sto.power_kw != null ? `${sto.power_kw} kWh` : 'N/D'],
      ], y);
    });
  }

  if (chargers.length > 0) {
    y = addSectionTitle(doc, 'COLONNINE DI RICARICA', y + 3);
    chargers.forEach((chg, i) => {
      y = addRows(doc, [
        [`Colonnina ${i + 1} - Marca`, orNa(chg.brand)],
        [`Colonnina ${i + 1} - Modello`, orNa(chg.model)],
        [`Colonnina ${i + 1} - Codice`, orNa(chg.code)],
      ], y);
    });
  }

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
  const photosPerPage = 6;
  const photoColumns = 2;
  const photoGap = 5;
  const photoCardW = (CONTENT_W - photoGap) / photoColumns;
  const photoCardH = 78;
  const photoStartY = 30;
  let includedPhotos = 0;
  for (const photo of photos) {
    try {
      const prepared = await preparePhoto(await photoLoader(photo.storage_path));
      if (includedPhotos % photosPerPage === 0) {
        doc.addPage();
        addCompactHeader(doc, logoDataUrl, 'ALLEGATO FOTOGRAFICO');
      }
      const positionOnPage = includedPhotos % photosPerPage;
      const column = positionOnPage % photoColumns;
      const row = Math.floor(positionOnPage / photoColumns);
      const cardX = MARGIN + column * (photoCardW + photoGap);
      const cardY = photoStartY + row * (photoCardH + photoGap);
      addPhotoCard(
        doc,
        prepared,
        photo,
        photo.panel_id ? panelMap.get(photo.panel_id) ?? null : null,
        cardX,
        cardY,
        photoCardW,
        photoCardH
      );
      includedPhotos += 1;
    } catch (error) {
      console.error(`Impossibile inserire la foto ${photo.file_name} nel PDF:`, error);
    }
  }

  addFooters(doc);
  return doc.output('blob');
}

export async function generateVehiclePdf(vehicle: Vehicle): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoDataUrl = await loadLogoDataUrl();

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
  doc.text('SCHEDA AUTOMEZZO', MARGIN + 50, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(227, 232, 245);
  doc.text('Parco automezzi', MARGIN + 50, 21.5);
  doc.setFontSize(8);
  doc.text(`Generato: ${new Date().toLocaleDateString('it-IT')}`, PAGE_W - MARGIN, 28, { align: 'right' });

  let y = 44;
  y = addSectionTitle(doc, 'DATI VEICOLO', y);
  y = addRows(doc, [
    ['Tipo', vehicle.type],
    ['Intestazione', vehicle.owner_type === 'Privato' ? 'Privato' : 'Aziendale'],
    ['Targa', vehicle.plate || 'N/D'],
    ['Marca', orNa(vehicle.brand)],
    ['Modello', orNa(vehicle.model)],
    ['Categoria', orNa(vehicle.vehicle_category)],
  ], y);

  y = addSectionTitle(doc, 'MANUTENZIONE', y + 3);
  y = addRows(doc, [
    ['Chilometri attuali', `${vehicle.mileage_km.toLocaleString('it-IT')} km`],
    ['Intervallo tagliando', `${vehicle.service_interval_km.toLocaleString('it-IT')} km`],
    ['Km ultimo tagliando', `${vehicle.last_service_km.toLocaleString('it-IT')} km`],
    ['Data ultimo tagliando', formatDate(vehicle.last_service_date)],
    ['Costo ultimo tagliando', vehicle.service_cost != null ? `€ ${Number(vehicle.service_cost).toFixed(2)}` : 'N/D'],
  ], y);

  y = addSectionTitle(doc, 'DOCUMENTI E SCADENZE', y + 3);
  y = addRows(doc, [
    ['Assicurazione - Scadenza', formatDate(vehicle.insurance_expiry)],
    ['Assicurazione - Compagnia', orNa(vehicle.insurance_company)],
    ['Assicurazione - Premio', vehicle.insurance_premium != null ? `€ ${vehicle.insurance_premium.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : 'N/D'],
    ['Garanzie', vehicle.insurance_categories?.join(' + ') || 'N/D'],
    ['Bollo - Scadenza', formatMonthYear(vehicle.tax_expiry)],
    ['Bollo - Costo', vehicle.tax_cost != null ? `€ ${Number(vehicle.tax_cost).toFixed(2)}` : 'N/D'],
    ['Revisione - Scadenza', formatMonthYear(vehicle.inspection_expiry)],
    ['Revisione - Costo', vehicle.inspection_cost != null ? `€ ${Number(vehicle.inspection_cost).toFixed(2)}` : 'N/D'],
    ['Revisione bombole gas', formatMonthYear(vehicle.gas_cylinders_inspection_expiry)],
    ['Revisione metano', formatMonthYear(vehicle.methane_inspection_expiry)],
  ], y);

  if (vehicle.notes) {
    y = addSectionTitle(doc, 'NOTE', y + 3);
    addRows(doc, [['Note', vehicle.notes]], y);
  }

  addFooters(doc);
  return doc.output('blob');
}

export async function generateInsurancePdf(insurance: Insurance): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoDataUrl = await loadLogoDataUrl();

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
  doc.text('SCHEDA ASSICURAZIONE', MARGIN + 50, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(227, 232, 245);
  doc.text('Polizza assicurativa', MARGIN + 50, 21.5);
  doc.setFontSize(8);
  doc.text(`Generato: ${new Date().toLocaleDateString('it-IT')}`, PAGE_W - MARGIN, 28, { align: 'right' });

  let y = 44;
  y = addSectionTitle(doc, 'DATI POLIZZA', y);
  y = addRows(doc, [
    ['Categoria', insurance.category],
    ['Tipo', orNa(insurance.insurance_type)],
    ['Compagnia', insurance.provider],
    ['Numero polizza', orNa(insurance.policy_number)],
    ['Bene assicurato', orNa(insurance.insured_item)],
    ['Premio annuo', insurance.premium_amount != null ? `€ ${insurance.premium_amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : 'N/D'],
    ['Inizio copertura', formatDate(insurance.start_date)],
    ['Scadenza copertura', formatDate(insurance.expiry_date)],
  ], y);

  if (insurance.notes) {
    y = addSectionTitle(doc, 'NOTE', y + 3);
    addRows(doc, [['Note', insurance.notes]], y);
  }

  addFooters(doc);
  return doc.output('blob');
}


export interface WorkSitePdfWorkerRow {
  worker: WorkReportWorker;
  hourly_rate: number | null;
}

export interface WorkSitePdfMaterialRow {
  material: WorkReportMaterial;
  unit_price: number | null;
}

export interface WorkSitePdfReportRow {
  report: WorkReport;
  workers: WorkSitePdfWorkerRow[];
  materials: WorkSitePdfMaterialRow[];
}

export interface WorkSitePdfData {
  site: WorkSite;
  phases: WorkSitePhase[];
  scopes: string[];
  linkedPlants: Plant[];
  quote: QuoteRequest | null;
  progressPercent: number;
  billingPercent: number;
  reports: WorkSitePdfReportRow[];
}

function formatCurrency(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return 'N/D';
  return value.toLocaleString('it-IT', { style: 'currency', currency: 'EUR' });
}

function sanitizePdfText(value: string | null | undefined): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : 'N/D';
}

function addWorkSiteHeader(doc: jsPDF, logoDataUrl: string | null, title: string): number {
  doc.setFillColor(...POLATO_BLUE);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  doc.setFillColor(...POLATO_RED);
  doc.rect(0, 28, PAGE_W, 1.4, 'F');

  if (logoDataUrl) {
    doc.setFillColor(...WHITE);
    doc.roundedRect(MARGIN, 4, 38, 20, 2, 2, 'F');
    addContainedLogo(doc, logoDataUrl, MARGIN + 2, 5.5, 34, 17);
  } else {
    doc.setTextColor(...WHITE);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('POLATO R&D', MARGIN, 15);
  }

  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(title, PAGE_W - MARGIN, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(227, 232, 245);
  doc.text(`Generato: ${new Date().toLocaleString('it-IT')}`, PAGE_W - MARGIN, 20, { align: 'right' });
  return 38;
}

function ensureWorkSiteSpace(
  doc: jsPDF,
  logoDataUrl: string | null,
  y: number,
  requiredHeight: number,
  continuationTitle = 'RESOCONTO CANTIERE',
): number {
  if (y + requiredHeight <= PAGE_H - 20) return y;
  doc.addPage();
  return addCompactHeader(doc, logoDataUrl, continuationTitle);
}

function addWorkSiteTableHeader(
  doc: jsPDF,
  y: number,
  columns: Array<{ label: string; x: number; width: number; align?: 'left' | 'right' }>,
): number {
  doc.setFillColor(...POLATO_BLUE);
  doc.rect(MARGIN, y, CONTENT_W, 7, 'F');
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  columns.forEach((column) => {
    const x = column.align === 'right' ? column.x + column.width - 1.5 : column.x + 1.5;
    doc.text(column.label, x, y + 4.8, { align: column.align ?? 'left' });
  });
  return y + 7;
}

function addWorkSiteTableRow(
  doc: jsPDF,
  y: number,
  columns: Array<{ value: string; x: number; width: number; align?: 'left' | 'right' }>,
  alternate: boolean,
): number {
  const wrapped = columns.map((column) => doc.splitTextToSize(column.value || '—', Math.max(8, column.width - 3)));
  const lineCount = Math.max(1, ...wrapped.map((lines) => lines.length));
  const height = Math.max(7, lineCount * 3.4 + 3);

  doc.setFillColor(...(alternate ? POLATO_BLUE_PALE : WHITE));
  doc.setDrawColor(225, 231, 239);
  doc.rect(MARGIN, y, CONTENT_W, height, 'FD');
  doc.setTextColor(...SLATE_DARK);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);

  columns.forEach((column, index) => {
    const x = column.align === 'right' ? column.x + column.width - 1.5 : column.x + 1.5;
    doc.text(wrapped[index], x, y + 4.5, {
      align: column.align ?? 'left',
      baseline: 'alphabetic',
    });
  });
  return y + height;
}

export async function generateWorkSitePdf(data: WorkSitePdfData): Promise<Blob> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const logoDataUrl = await loadLogoDataUrl();
  let y = addWorkSiteHeader(doc, logoDataUrl, 'RESOCONTO FINALE CANTIERE');

  const markupPercent = Number(data.site.material_markup_percent || 0);
  const safeMarkup = Number.isFinite(markupPercent) ? markupPercent : 0;
  const quoteValue = data.quote?.value_ex_vat == null ? null : Number(data.quote.value_ex_vat);

  let totalLabor = 0;
  let totalMaterial = 0;
  let totalMarkedMaterial = 0;
  let missingCosts = 0;
  let totalHours = 0;

  data.reports.forEach((entry) => {
    entry.workers.forEach(({ worker, hourly_rate }) => {
      totalHours += Number(worker.hours || 0);
      if (hourly_rate == null || !Number.isFinite(hourly_rate)) {
        missingCosts += 1;
        return;
      }
      totalLabor += Number(worker.hours || 0) * hourly_rate;
    });
    entry.materials.forEach(({ material, unit_price }) => {
      if (unit_price == null || !Number.isFinite(unit_price)) {
        missingCosts += 1;
        return;
      }
      const raw = Number(material.quantity || 0) * unit_price;
      totalMaterial += raw;
      totalMarkedMaterial += raw * (1 + safeMarkup / 100);
    });
  });

  const totalCost = totalLabor + totalMaterial;
  const usedPercent = quoteValue != null && quoteValue > 0 ? totalCost / quoteValue * 100 : null;
  const margin = quoteValue == null ? null : quoteValue - totalCost;
  const marginPercent = quoteValue != null && quoteValue > 0 && margin != null ? margin / quoteValue * 100 : null;

  y = addSectionTitle(doc, 'DATI CANTIERE', y);
  y = addRows(doc, [
    ['Cantiere', data.site.name],
    ['Località', sanitizePdfText(data.site.location)],
    ['Categoria', data.site.category],
    ['Stato', data.site.site_status],
    ['Data inizio', data.site.start_date ? formatDate(data.site.start_date) : sanitizePdfText(data.site.start_date_note)],
    ['Fine prevista', formatDate(data.site.planned_end_date)],
    ['Ambiti', data.scopes.length > 0 ? data.scopes.join(' · ') : 'N/D'],
    ['Impianti FV collegati', data.linkedPlants.length > 0 ? data.linkedPlants.map((plant) => plant.owner_name).join(' · ') : 'Nessuno'],
    ['Note', sanitizePdfText(data.site.notes)],
  ], y);

  y = ensureWorkSiteSpace(doc, logoDataUrl, y + 3, 55);
  y = addSectionTitle(doc, 'RIEPILOGO ECONOMICO', y + 3);
  y = addRows(doc, [
    ['Preventivo', data.quote ? `${data.quote.progressive_number}/${data.quote.series} · ${data.quote.client}` : 'N/D'],
    ['Valore preventivo senza IVA', formatCurrency(quoteValue)],
    ['Ricarico materiali cantiere', `${safeMarkup.toLocaleString('it-IT', { maximumFractionDigits: 2 })}%`],
    ['Costo manodopera', formatCurrency(totalLabor)],
    ['Costo materiali', formatCurrency(totalMaterial)],
    ['Valore materiali con ricarico', formatCurrency(totalMarkedMaterial)],
    ['Costo totale sostenuto', formatCurrency(totalCost)],
    ['Preventivo utilizzato', usedPercent == null ? 'N/D' : `${usedPercent.toLocaleString('it-IT', { maximumFractionDigits: 2 })}%`],
    ['Margine residuo', formatCurrency(margin)],
    ['Margine residuo %', marginPercent == null ? 'N/D' : `${marginPercent.toLocaleString('it-IT', { maximumFractionDigits: 2 })}%`],
    ['Ore registrate', `${totalHours.toLocaleString('it-IT', { maximumFractionDigits: 2 })} h`],
    ['Costi mancanti/non valorizzati', String(missingCosts)],
  ], y);

  y = ensureWorkSiteSpace(doc, logoDataUrl, y + 3, 45);
  y = addSectionTitle(doc, 'AVANZAMENTO CANTIERE', y + 3);
  y = addRows(doc, [
    ['Avanzamento operativo', `${data.progressPercent.toLocaleString('it-IT', { maximumFractionDigits: 1 })}%`],
    ['Fatturazione fasi', `${data.billingPercent.toLocaleString('it-IT', { maximumFractionDigits: 1 })}%`],
    ['Numero rapportini', String(data.reports.length)],
  ], y);

  if (data.phases.length > 0) {
    y = ensureWorkSiteSpace(doc, logoDataUrl, y + 4, 25);
    y = addSectionTitle(doc, 'FASI CANTIERE', y + 4);
    const phaseCols = [
      { label: 'Fase', x: MARGIN, width: 57 },
      { label: 'Peso', x: MARGIN + 57, width: 20, align: 'right' as const },
      { label: 'Avanzamento', x: MARGIN + 77, width: 42 },
      { label: 'Fatturazione', x: MARGIN + 119, width: 61 },
    ];
    y = addWorkSiteTableHeader(doc, y, phaseCols);
    data.phases.forEach((phase, index) => {
      y = ensureWorkSiteSpace(doc, logoDataUrl, y, 14, 'FASI CANTIERE');
      if (y < 35) y = addWorkSiteTableHeader(doc, y, phaseCols);
      y = addWorkSiteTableRow(doc, y, [
        { value: phase.phase_label, x: MARGIN, width: 57 },
        { value: `${Number(phase.weight_percent).toLocaleString('it-IT')}%`, x: MARGIN + 57, width: 20, align: 'right' },
        { value: phase.progress_status, x: MARGIN + 77, width: 42 },
        { value: phase.billing_status, x: MARGIN + 119, width: 61 },
      ], index % 2 === 0);
    });
  }

  const sortedReports = [...data.reports].sort((a, b) =>
    a.report.report_date.localeCompare(b.report.report_date) ||
    a.report.created_at.localeCompare(b.report.created_at)
  );

  sortedReports.forEach((entry, reportIndex) => {
    y = ensureWorkSiteSpace(doc, logoDataUrl, y + 6, 42, 'RAPPORTINI CANTIERE');
    y = addSectionTitle(
      doc,
      `RAPPORTINO ${reportIndex + 1} · ${formatDate(entry.report.report_date)}`,
      y + 6,
    );

    y = addRows(doc, [
      ['Riferimento', entry.report.client_reference],
      ['Stato', entry.report.status],
      ['Lavorazione', sanitizePdfText(entry.report.work_description)],
      ['Note', sanitizePdfText(entry.report.notes)],
    ], y);

    if (entry.workers.length > 0) {
      y = ensureWorkSiteSpace(doc, logoDataUrl, y + 2, 20, 'RAPPORTINI · MANODOPERA');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...POLATO_BLUE);
      doc.text('MANODOPERA', MARGIN, y + 4);
      y += 7;
      const workerCols = [
        { label: 'Operatore', x: MARGIN, width: 65 },
        { label: 'Ore', x: MARGIN + 65, width: 20, align: 'right' as const },
        { label: 'Tipo', x: MARGIN + 85, width: 35 },
        { label: 'Costo/h', x: MARGIN + 120, width: 28, align: 'right' as const },
        { label: 'Totale', x: MARGIN + 148, width: 32, align: 'right' as const },
      ];
      y = addWorkSiteTableHeader(doc, y, workerCols);
      entry.workers.forEach(({ worker, hourly_rate }, index) => {
        y = ensureWorkSiteSpace(doc, logoDataUrl, y, 12, 'RAPPORTINI · MANODOPERA');
        if (y < 35) y = addWorkSiteTableHeader(doc, y, workerCols);
        const lineTotal = hourly_rate == null ? null : Number(worker.hours) * hourly_rate;
        y = addWorkSiteTableRow(doc, y, [
          { value: worker.worker_name, x: MARGIN, width: 65 },
          { value: Number(worker.hours).toLocaleString('it-IT'), x: MARGIN + 65, width: 20, align: 'right' },
          { value: worker.rate_type || 'ORDINARIA', x: MARGIN + 85, width: 35 },
          { value: formatCurrency(hourly_rate), x: MARGIN + 120, width: 28, align: 'right' },
          { value: formatCurrency(lineTotal), x: MARGIN + 148, width: 32, align: 'right' },
        ], index % 2 === 0);
      });
    }

    if (entry.materials.length > 0) {
      y = ensureWorkSiteSpace(doc, logoDataUrl, y + 3, 20, 'RAPPORTINI · MATERIALI');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...POLATO_BLUE);
      doc.text('MATERIALI', MARGIN, y + 4);
      y += 7;
      const materialCols = [
        { label: 'Materiale', x: MARGIN, width: 60 },
        { label: 'Q.tà', x: MARGIN + 60, width: 22, align: 'right' as const },
        { label: 'Costo/u', x: MARGIN + 82, width: 30, align: 'right' as const },
        { label: 'Rincar./u', x: MARGIN + 112, width: 32, align: 'right' as const },
        { label: 'Costo', x: MARGIN + 144, width: 36, align: 'right' as const },
      ];
      y = addWorkSiteTableHeader(doc, y, materialCols);
      entry.materials.forEach(({ material, unit_price }, index) => {
        y = ensureWorkSiteSpace(doc, logoDataUrl, y, 12, 'RAPPORTINI · MATERIALI');
        if (y < 35) y = addWorkSiteTableHeader(doc, y, materialCols);
        const markedUnit = unit_price == null ? null : unit_price * (1 + safeMarkup / 100);
        const rawTotal = unit_price == null ? null : Number(material.quantity) * unit_price;
        y = addWorkSiteTableRow(doc, y, [
          { value: material.description, x: MARGIN, width: 60 },
          { value: `${Number(material.quantity).toLocaleString('it-IT')} ${material.unit}`, x: MARGIN + 60, width: 22, align: 'right' },
          { value: formatCurrency(unit_price), x: MARGIN + 82, width: 30, align: 'right' },
          { value: formatCurrency(markedUnit), x: MARGIN + 112, width: 32, align: 'right' },
          { value: formatCurrency(rawTotal), x: MARGIN + 144, width: 36, align: 'right' },
        ], index % 2 === 0);
      });
    }
  });

  y = ensureWorkSiteSpace(doc, logoDataUrl, y + 6, 45, 'RIEPILOGO FINALE');
  y = addSectionTitle(doc, 'RIEPILOGO FINALE', y + 6);
  addRows(doc, [
    ['Costo manodopera', formatCurrency(totalLabor)],
    ['Costo materiali', formatCurrency(totalMaterial)],
    ['Valore materiali con ricarico', formatCurrency(totalMarkedMaterial)],
    ['Costo totale sostenuto', formatCurrency(totalCost)],
    ['Margine residuo', formatCurrency(margin)],
    ['Costi mancanti', String(missingCosts)],
  ], y);

  addFooters(doc);
  return doc.output('blob');
}
