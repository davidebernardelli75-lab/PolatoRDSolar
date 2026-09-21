import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import type { Plant, Panel, PanelPhoto, PlantInverter, PlantStorage } from './types';
import { downloadPhotoBlob } from './api';
import { generatePlantPdf } from './pdf';

function sanitizeFileName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').trim() || 'Senza_Nome';
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  return dateStr.slice(0, 10);
}

function buildPlantTextFile(plant: Plant, panels: Panel[], inverters: PlantInverter[] = [], storages: PlantStorage[] = []): string {
  const lines: string[] = [];
  lines.push('=================================');
  lines.push('   POLATO R&D - ARCHIVIO IMPIANTO');
  lines.push('=================================');
  lines.push('');
  lines.push('DATI PROPRIETARIO');
  lines.push('---------------------------------');
  lines.push(`Tipo: ${plant.owner_type}`);
  lines.push(`${plant.owner_type === 'Azienda' ? 'Ragione Sociale' : 'Nome Proprietario'}: ${plant.owner_name}`);
  lines.push(`Codice Fiscale / P.IVA: ${plant.fiscal_or_vat || 'N/D'}`);
  lines.push(`Indirizzo: ${plant.address}`);
  lines.push(`Città / Paese: ${plant.city || 'N/D'}`);
  lines.push(`Provincia: ${plant.province || 'N/D'}`);
  lines.push(`Regione: ${plant.region || 'N/D'}`);
  lines.push(`Telefono: ${plant.phone || 'N/D'}`);
  lines.push(`Email: ${plant.email || 'N/D'}`);
  lines.push('');
  lines.push('DATI TECNICI IMPIANTO');
  lines.push('---------------------------------');
  lines.push(`POD: ${plant.pod || 'N/D'}`);
  lines.push(`Codice CENSIMP: ${plant.censimp_code || 'N/D'}`);
  lines.push(`Potenza Totale (kW): ${plant.total_power_kw ?? 'N/D'}`);
  lines.push(`Marca/Modello Pannelli: ${plant.panel_brand_model || 'N/D'}`);
  lines.push(`Colonnina - Marca: ${plant.charger_brand || 'N/D'}`);
  lines.push(`Colonnina - Modello: ${plant.charger_model || 'N/D'}`);
  lines.push(`Colonnina - Codice: ${plant.charger_code || 'N/D'}`);
  lines.push(`Data Installazione: ${formatDate(plant.installation_date)}`);
  lines.push(`Note: ${plant.notes || 'Nessuna'}`);
  if (inverters.length > 0) {
    lines.push('');
    lines.push('INVERTER');
    lines.push('---------------------------------');
    inverters.forEach((inv, i) => {
      lines.push(`Inverter ${i + 1}:`);
      lines.push(`  Marca: ${inv.brand || 'N/D'}`);
      lines.push(`  Modello: ${inv.model || 'N/D'}`);
      lines.push(`  Codice: ${inv.code || 'N/D'}`);
    });
  }

  if (storages.length > 0) {
    lines.push('');
    lines.push('SISTEMI DI ACCUMULO');
    lines.push('---------------------------------');
    storages.forEach((sto, i) => {
      lines.push(`Accumulo ${i + 1}:`);
      lines.push(`  Marca: ${sto.brand || 'N/D'}`);
      lines.push(`  Modello: ${sto.model || 'N/D'}`);
      lines.push(`  Codice: ${sto.code || 'N/D'}`);
      lines.push(`  Potenza (kW): ${sto.power_kw ?? 'N/D'}`);
    });
  }

  lines.push('');
  lines.push('PANNELLI REGISTRATI');
  lines.push('---------------------------------');
  if (panels.length === 0) {
    lines.push('Nessun pannello registrato.');
  } else {
    panels.forEach((panel, index) => {
      lines.push(`Pannello ${index + 1}:`);
      lines.push(`  Matricola/Barcode: ${panel.serial_number}`);
      lines.push(`  Posizione: ${panel.position_label || 'N/D'}`);
      lines.push(`  Note: ${panel.notes || 'Nessuna'}`);
      lines.push('');
    });
  }
  lines.push('=================================');
  lines.push(`Esportato il ${new Date().toLocaleString('it-IT')}`);
  lines.push('=================================');
  return lines.join('\n');
}

export async function exportPlantArchive(
  plant: Plant,
  panels: Panel[],
  photos: PanelPhoto[],
  inverters: PlantInverter[] = [],
  storages: PlantStorage[] = [],
): Promise<void> {
  const zip = new JSZip();
  const folderName = `${sanitizeFileName(plant.owner_name)} - ${sanitizeFileName(plant.address)}`;
  const folder = zip.folder(folderName);
  if (!folder) throw new Error('Impossibile creare la cartella principale.');

  folder.file('Scheda_Tecnica.txt', buildPlantTextFile(plant, panels, inverters, storages));
  folder.file('Relazione_Tecnica.pdf', await generatePlantPdf(plant, panels, photos, undefined, inverters, storages));

  const photoFolder = folder.folder('Foto_Pannelli');
  if (!photoFolder) throw new Error('Impossibile creare la cartella foto.');

  const panelMap = new Map<string, Panel>();
  panels.forEach((p) => panelMap.set(p.id, p));

  for (const photo of photos) {
    try {
      const blob = await downloadPhotoBlob(photo.storage_path);
      const panel = photo.panel_id ? panelMap.get(photo.panel_id) : null;
      const serial = panel?.serial_number || 'Senza_Matricola';
      const date = formatDate(photo.created_at);
      const ext = photo.file_name.split('.').pop()?.toLowerCase() || 'jpg';
      const renamed = `${sanitizeFileName(serial)}_${date}.${ext}`;
      photoFolder.file(renamed, blob);
    } catch {
      // skip photos that fail to download
    }
  }

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `${folderName}.zip`);
}
