import JSZip from 'jszip';

export type QuoteValueConfidence = 'high' | 'medium';

export interface QuoteValueExtractionResult {
  value: number;
  confidence: QuoteValueConfidence;
  label: string;
  fileName: string;
  method: 'pdf-text' | 'ocr' | 'docx' | 'xlsx';
}

export interface QuoteValueExtractionSummary {
  result: QuoteValueExtractionResult | null;
  warnings: string[];
}

interface AmountCandidate {
  value: number;
  score: number;
  label: string;
}

const PDFJS_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs';
const PDFJS_WORKER_URL = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';
const TESSERACT_URL = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.esm.min.js';

async function importExternal(url: string): Promise<Record<string, any>> {
  return import(/* @vite-ignore */ url) as Promise<Record<string, any>>;
}

function extensionOf(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() ?? '';
}

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\r/g, '')
    .trim();
}

function parseAmount(raw: string): number | null {
  let value = raw
    .replace(/EUR/gi, '')
    .replace(/€/g, '')
    .replace(/\s/g, '')
    .replace(/[^0-9,.-]/g, '');

  if (!value || value === '-' || value === '.' || value === ',') return null;

  const comma = value.lastIndexOf(',');
  const dot = value.lastIndexOf('.');

  if (comma >= 0 && dot >= 0) {
    if (comma > dot) {
      value = value.replace(/\./g, '').replace(',', '.');
    } else {
      value = value.replace(/,/g, '');
    }
  } else if (comma >= 0) {
    const decimals = value.length - comma - 1;
    value = decimals === 1 || decimals === 2
      ? value.replace(/\./g, '').replace(',', '.')
      : value.replace(/,/g, '');
  } else if (dot >= 0) {
    const decimals = value.length - dot - 1;
    if (!(decimals === 1 || decimals === 2)) {
      value = value.replace(/\./g, '');
    }
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function candidateScore(context: string, amountStart: number): { score: number; label: string } {
  const upper = context.toUpperCase();
  const before = upper.slice(Math.max(0, amountStart - 100), amountStart);
  const around = upper.slice(Math.max(0, amountStart - 120), Math.min(upper.length, amountStart + 100));

  let score = 0;
  let label = 'Importo';

  if (/TOTALE\s+(?:IMPONIBILE|NETTO|OFFERTA|PREVENTIVO|LAVORI|FORNITURA)/.test(before)) {
    score += 150;
    label = 'Totale preventivo senza IVA';
  } else if (/(?:IMPONIBILE\s+TOTALE|TOTALE\s+IMPONIBILE)/.test(around)) {
    score += 145;
    label = 'Totale imponibile';
  } else if (/\bIMPONIBILE\b/.test(before)) {
    score += 135;
    label = 'Imponibile';
  } else if (/\bTOTALE\b/.test(before)) {
    score += 85;
    label = 'Totale';
  }

  if (/(?:IVA\s+ESCLUSA|ESCLUS[AO]\s+IVA|OLTRE\s+IVA|\+\s*IVA|IVA\s+NON\s+COMPRESA)/.test(around)) {
    score += 55;
    label = label === 'Importo' ? 'Importo IVA esclusa' : label;
  }

  if (/(?:€|\bEUR\b)/.test(around)) score += 12;
  if (/(?:OFFERTA|PREVENTIVO|CORRISPETTIVO|LAVORI|FORNITURA)/.test(around)) score += 18;

  if (/(?:TOTALE\s+IVA|IVA\s+INCLUSA|IVA\s+COMPRESA|TOTALE\s+DOCUMENTO|TOTALE\s+DA\s+PAGARE)/.test(around)) {
    score -= 100;
  }

  if (/IVA\s*(?:AL\s*)?\d{1,2}(?:[,.]\d+)?\s*%?\s*$/.test(before)) {
    score -= 170;
  }

  if (/(?:ACCONTO|ANTICIPO|RATA|SCONTO|RITENUTA)/.test(around)) score -= 55;

  return { score, label };
}

function findBestAmount(text: string): AmountCandidate | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;

  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const amountRegex = /(?:€\s*|\bEUR\s*)?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})|(?:€\s*|\bEUR\s*)?\d+(?:[.,]\d{1,2})?/gi;
  const candidates: AmountCandidate[] = [];

  lines.forEach((line, index) => {
    const previous = lines[index - 1] ?? '';
    const context = [previous, line, lines[index + 1] ?? ''].join(' | ');
    const lineOffset = previous.length + 3;

    for (const match of line.matchAll(amountRegex)) {
      const raw = match[0];
      const value = parseAmount(raw);
      if (value == null) continue;

      const startInLine = match.index ?? 0;
      const amountStart = lineOffset + startInLine;
      const { score, label } = candidateScore(context, amountStart);

      const looksLikePercentage = /%/.test(line.slice(startInLine, startInLine + raw.length + 3));
      if (looksLikePercentage && value <= 100) continue;
      if (score <= 0) continue;

      candidates.push({ value, score, label });
    }
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score || b.value - a.value);
  const best = candidates[0];

  return best.score >= 75 ? best : null;
}

async function readDocx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('Documento Word non leggibile.');

  const documentXml = new DOMParser().parseFromString(xml, 'application/xml');
  const paragraphs = Array.from(documentXml.getElementsByTagNameNS('*', 'p'));

  return paragraphs
    .map((paragraph) =>
      Array.from(paragraph.getElementsByTagNameNS('*', 't'))
        .map((node) => node.textContent ?? '')
        .join(' '),
    )
    .join('\n');
}

function sharedStringsFromXml(xml: string | null): string[] {
  if (!xml) return [];
  const documentXml = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(documentXml.getElementsByTagNameNS('*', 'si')).map((item) =>
    Array.from(item.getElementsByTagNameNS('*', 't'))
      .map((node) => node.textContent ?? '')
      .join(' '),
  );
}

async function readXlsx(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const sharedXml = await zip.file('xl/sharedStrings.xml')?.async('string') ?? null;
  const sharedStrings = sharedStringsFromXml(sharedXml);

  const worksheetPaths = Object.keys(zip.files)
    .filter((path) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(path))
    .sort((a, b) => a.localeCompare(b, 'it', { numeric: true }));

  if (worksheetPaths.length === 0) throw new Error('Foglio Excel non leggibile.');

  const sheets: string[] = [];

  for (const path of worksheetPaths) {
    const xml = await zip.file(path)?.async('string');
    if (!xml) continue;

    const documentXml = new DOMParser().parseFromString(xml, 'application/xml');
    const rows = Array.from(documentXml.getElementsByTagNameNS('*', 'row'));

    for (const row of rows) {
      const values = Array.from(row.getElementsByTagNameNS('*', 'c')).map((cell) => {
        const type = cell.getAttribute('t');
        if (type === 'inlineStr') {
          return Array.from(cell.getElementsByTagNameNS('*', 't'))
            .map((node) => node.textContent ?? '')
            .join(' ');
        }

        const rawValue = cell.getElementsByTagNameNS('*', 'v')[0]?.textContent ?? '';
        if (type === 's') {
          const index = Number(rawValue);
          return Number.isInteger(index) ? sharedStrings[index] ?? rawValue : rawValue;
        }

        return rawValue;
      });

      if (values.some(Boolean)) sheets.push(values.join(' | '));
    }
  }

  return sheets.join('\n');
}

async function createOcrWorker(): Promise<any> {
  const tesseract = await importExternal(TESSERACT_URL);
  if (typeof tesseract.createWorker !== 'function') {
    throw new Error('Motore OCR non disponibile.');
  }
  return tesseract.createWorker('ita+eng');
}

async function readImageWithOcr(file: File): Promise<string> {
  const worker = await createOcrWorker();
  try {
    const result = await worker.recognize(file);
    return String(result?.data?.text ?? '');
  } finally {
    await worker.terminate();
  }
}

async function readPdf(file: File): Promise<{ text: string; usedOcr: boolean }> {
  const pdfjs = await importExternal(PDFJS_URL);
  if (!pdfjs.getDocument) throw new Error('Lettore PDF non disponibile.');
  if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    const text = (textContent.items as Array<{ str?: string }>)
      .map((item) => item.str ?? '')
      .join(' ');
    pageTexts.push(text);
  }

  const textLayer = pageTexts.join('\n');
  if (findBestAmount(textLayer)) return { text: textLayer, usedOcr: false };

  const worker = await createOcrWorker();
  const ocrTexts: string[] = [];
  try {
    const pagesToRead = Array.from(
      new Set([
        pdf.numPages,
        Math.max(1, pdf.numPages - 1),
        Math.max(1, pdf.numPages - 2),
      ]),
    );

    for (const pageNumber of pagesToRead) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.7 });
      const canvas = document.createElement('canvas');
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const context = canvas.getContext('2d');
      if (!context) continue;

      await page.render({ canvasContext: context, viewport }).promise;
      const result = await worker.recognize(canvas);
      ocrTexts.push(String(result?.data?.text ?? ''));
    }
  } finally {
    await worker.terminate();
  }

  return { text: [textLayer, ...ocrTexts].join('\n'), usedOcr: true };
}

async function extractFromFile(file: File): Promise<{
  candidate: AmountCandidate | null;
  method: QuoteValueExtractionResult['method'] | null;
  warning: string | null;
}> {
  const ext = extensionOf(file);

  try {
    if (ext === 'pdf' || file.type === 'application/pdf') {
      const pdf = await readPdf(file);
      return {
        candidate: findBestAmount(pdf.text),
        method: pdf.usedOcr ? 'ocr' : 'pdf-text',
        warning: null,
      };
    }

    if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) || file.type.startsWith('image/')) {
      const text = await readImageWithOcr(file);
      return { candidate: findBestAmount(text), method: 'ocr', warning: null };
    }

    if (ext === 'docx') {
      const text = await readDocx(file);
      return { candidate: findBestAmount(text), method: 'docx', warning: null };
    }

    if (ext === 'xlsx') {
      const text = await readXlsx(file);
      return { candidate: findBestAmount(text), method: 'xlsx', warning: null };
    }

    if (ext === 'doc' || ext === 'xls') {
      return {
        candidate: null,
        method: null,
        warning: `${file.name}: il vecchio formato .${ext} viene allegato ma non può essere analizzato automaticamente. Salvalo come .${ext}x o PDF per la lettura del valore.`,
      };
    }

    return {
      candidate: null,
      method: null,
      warning: `${file.name}: formato non analizzabile automaticamente.`,
    };
  } catch (error) {
    return {
      candidate: null,
      method: null,
      warning: `${file.name}: ${error instanceof Error ? error.message : 'analisi automatica non riuscita.'}`,
    };
  }
}

export async function extractQuoteValueFromFiles(files: File[]): Promise<QuoteValueExtractionSummary> {
  const warnings: string[] = [];
  const results: QuoteValueExtractionResult[] = [];

  for (const file of files) {
    const extracted = await extractFromFile(file);
    if (extracted.warning) warnings.push(extracted.warning);
    if (!extracted.candidate || !extracted.method) continue;

    results.push({
      value: extracted.candidate.value,
      confidence: extracted.candidate.score >= 125 ? 'high' : 'medium',
      label: extracted.candidate.label,
      fileName: file.name,
      method: extracted.method,
    });
  }

  if (results.length === 0) {
    return { result: null, warnings };
  }

  results.sort((a, b) => {
    const confidence = (value: QuoteValueConfidence) => value === 'high' ? 2 : 1;
    return confidence(b.confidence) - confidence(a.confidence) || b.value - a.value;
  });

  return { result: results[0], warnings };
}
