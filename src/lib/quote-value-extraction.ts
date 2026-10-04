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

type AmountKind = 'net' | 'gross' | 'generic';

interface AmountCandidate {
  value: number;
  score: number;
  label: string;
  kind: AmountKind;
  overall: boolean;
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
    .replace(/EURO/gi, '')
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

function hasCurrencyMarker(line: string, amountStart: number, raw: string): boolean {
  if (/(?:€|\bEUR\b|\bEURO\b)/i.test(raw)) return true;
  const around = line.slice(
    Math.max(0, amountStart - 10),
    Math.min(line.length, amountStart + raw.length + 12),
  );
  return /(?:€|\bEUR\b|\bEURO\b)/i.test(around);
}

function looksMoneyFormatted(raw: string): boolean {
  const compact = raw.replace(/\s/g, '');
  return /[.,]\d{2}(?:\D|$)/.test(compact) || /\d{1,3}(?:\.\d{3})+(?:,\d{2})?/.test(compact);
}

function looksNonMonetary(
  line: string,
  amountStart: number,
  raw: string,
  value: number,
): boolean {
  const before = line.slice(Math.max(0, amountStart - 18), amountStart).toUpperCase();
  const after = line.slice(amountStart + raw.length, Math.min(line.length, amountStart + raw.length + 22)).toUpperCase();
  const around = `${before} ${raw.toUpperCase()} ${after}`;

  if (/\b(?:KW|KWH|KWP|WP|W|V|A|AH|MAH|HZ|MM|CM|M|M2|M²|M3|M³|KG|G|L|PZ|PZ\.|PEZZI)\b/.test(after)) {
    return true;
  }

  if (/\b(?:POTENZA|CAPACITA|CAPACITÀ|QUANTITA|QUANTITÀ|QTA|QTÀ|PZ|PZ\.|NR\.?|N\.)\s*$/.test(before)) {
    return true;
  }

  if (/%/.test(after) && value <= 100) return true;

  if (/\bDATA\b/.test(around) && /\d{1,2}[./-]\d{1,2}[./-]\d{2,4}/.test(around)) {
    return true;
  }

  if (/\bPREVENTIVO\s+(?:NR|N\.?)/.test(around) && !hasCurrencyMarker(line, amountStart, raw)) {
    return true;
  }

  const currencyLike = hasCurrencyMarker(line, amountStart, raw) || looksMoneyFormatted(raw);
  if (value < 100 && !currencyLike) return true;

  return false;
}

function scoreCandidate(context: string): {
  score: number;
  label: string;
  kind: AmountKind;
  overall: boolean;
} {
  const upper = context.toUpperCase();

  const explicitNet =
    /TOTALE\s+(?:GENERALE\s+|IMPIANTO\s+|PREVENTIVO\s+|OFFERTA\s+)?IVA\s+ESCLUSA/.test(upper) ||
    /TOTALE\s+(?:GENERALE\s+|IMPIANTO\s+|PREVENTIVO\s+|OFFERTA\s+)?IMPONIBILE/.test(upper) ||
    /IMPONIBILE\s+(?:TOTALE|COMPLESSIVO|GENERALE)/.test(upper) ||
    /TOTALE\s+(?:NETTO|NETTO\s+IVA)/.test(upper);

  const overall =
    /TOTALE\s+(?:GENERALE|PREVENTIVO|OFFERTA)\b/.test(upper) &&
    /(?:IVA\s+ESCLUSA|IMPONIBILE|NETTO)/.test(upper);

  if (explicitNet) {
    return {
      score: overall ? 260 : 230,
      label: overall ? 'Totale preventivo senza IVA' : 'Totale imponibile',
      kind: 'net',
      overall,
    };
  }

  if (/(?:IVA\s+ESCLUSA|ESCLUS[AO]\s+IVA|OLTRE\s+IVA|IVA\s+NON\s+COMPRESA)/.test(upper) && /\bTOTALE\b/.test(upper)) {
    return {
      score: 215,
      label: 'Totale IVA esclusa',
      kind: 'net',
      overall: false,
    };
  }

  if (/(?:TOTALE\s+IVATO|TOTALE\s+IVA\s+INCLUSA|IVA\s+INCLUSA|IVA\s+COMPRESA|TOTALE\s+DOCUMENTO|TOTALE\s+DA\s+PAGARE)/.test(upper)) {
    return {
      score: 200,
      label: 'Totale IVA inclusa',
      kind: 'gross',
      overall: /TOTALE\s+(?:GENERALE|IMPIANTO|PREVENTIVO|OFFERTA)/.test(upper),
    };
  }

  if (/\bIMPONIBILE\b/.test(upper)) {
    return {
      score: 185,
      label: 'Imponibile',
      kind: 'net',
      overall: false,
    };
  }

  if (/\bTOTALE\b/.test(upper)) {
    return {
      score: 105,
      label: 'Totale',
      kind: 'generic',
      overall: false,
    };
  }

  if (/(?:OFFERTA|PREVENTIVO|CORRISPETTIVO)/.test(upper)) {
    return {
      score: 55,
      label: 'Importo preventivo',
      kind: 'generic',
      overall: false,
    };
  }

  return {
    score: 0,
    label: 'Importo',
    kind: 'generic',
    overall: false,
  };
}

function findCandidates(text: string): AmountCandidate[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const lines = normalized.split('\n').map((line) => line.trim()).filter(Boolean);
  const amountRegex = /(?:€\s*|\bEUR\s*|\bEURO\s*)?\d{1,3}(?:[.\s]\d{3})*(?:,\d{1,2})|(?:€\s*|\bEUR\s*|\bEURO\s*)?\d+(?:[.,]\d{1,2})?/gi;
  const candidates: AmountCandidate[] = [];

  lines.forEach((line, index) => {
    const previous = lines[index - 1] ?? '';
    const next = lines[index + 1] ?? '';
    const context = [previous, line, next].join(' | ');

    for (const match of line.matchAll(amountRegex)) {
      const raw = match[0];
      const value = parseAmount(raw);
      if (value == null) continue;

      const start = match.index ?? 0;
      if (looksNonMonetary(line, start, raw, value)) continue;

      const scored = scoreCandidate(context);
      if (scored.score <= 0) continue;

      let score = scored.score;

      if (hasCurrencyMarker(line, start, raw)) score += 30;
      else if (looksMoneyFormatted(raw)) score += 15;

      if (/(?:ACCONTO|ANTICIPO|RATA|SCONTO|RITENUTA)/i.test(context)) score -= 70;
      if (/(?:PREZZO\s+UNITARIO|COSTO\s+AL\s+(?:KW|KWH)|€\s*\d+(?:[.,]\d+)?\s*\/\s*(?:KW|KWH))/i.test(context)) score -= 90;

      if (score < 70) continue;

      candidates.push({
        value,
        score,
        label: scored.label,
        kind: scored.kind,
        overall: scored.overall,
      });
    }
  });

  return candidates.sort((a, b) => b.score - a.score || b.value - a.value);
}

function centsKey(value: number): number {
  return Math.round(value * 100);
}

function bestValueFromPages(pages: string[]): AmountCandidate | null {
  const perPage = pages.map((page) => findCandidates(page));

  const overallNet = perPage
    .flat()
    .filter((candidate) => candidate.kind === 'net' && candidate.overall)
    .sort((a, b) => b.score - a.score || b.value - a.value);

  if (overallNet.length > 0) return overallNet[0];

  const explicitNetByPage: AmountCandidate[] = [];
  perPage.forEach((candidates) => {
    const bestNet = candidates
      .filter((candidate) => candidate.kind === 'net' && candidate.score >= 200)
      .sort((a, b) => b.score - a.score || b.value - a.value)[0];
    if (bestNet) explicitNetByPage.push(bestNet);
  });

  if (explicitNetByPage.length > 0) {
    const unique = new Map<number, AmountCandidate>();
    explicitNetByPage.forEach((candidate) => {
      const key = centsKey(candidate.value);
      const current = unique.get(key);
      if (!current || candidate.score > current.score) unique.set(key, candidate);
    });

    const netParts = [...unique.values()];
    if (netParts.length === 1) return netParts[0];

    const netSum = netParts.reduce((sum, candidate) => sum + candidate.value, 0);
    const alreadySummed = netParts.find((candidate) =>
      Math.abs(candidate.value - (netSum - candidate.value)) < 0.01
    );

    if (alreadySummed) {
      return {
        ...alreadySummed,
        label: 'Totale preventivo senza IVA',
        overall: true,
      };
    }

    return {
      value: netSum,
      score: Math.min(...netParts.map((candidate) => candidate.score)) + 20,
      label: 'Somma imponibili del preventivo',
      kind: 'net',
      overall: true,
    };
  }

  const generic = perPage
    .flat()
    .filter((candidate) => candidate.kind === 'generic' && candidate.score >= 100)
    .sort((a, b) => b.score - a.score || b.value - a.value);

  return generic[0] ?? null;
}

async function readDocx(file: File): Promise<string[]> {
  const zip = await JSZip.loadAsync(file);
  const xml = await zip.file('word/document.xml')?.async('string');
  if (!xml) throw new Error('Documento Word non leggibile.');

  const documentXml = new DOMParser().parseFromString(xml, 'application/xml');
  const paragraphs = Array.from(documentXml.getElementsByTagNameNS('*', 'p'));

  return [paragraphs
    .map((paragraph) =>
      Array.from(paragraph.getElementsByTagNameNS('*', 't'))
        .map((node) => node.textContent ?? '')
        .join(' '),
    )
    .join('\n')];
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

async function readXlsx(file: File): Promise<string[]> {
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
    const lines: string[] = [];

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

      if (values.some(Boolean)) lines.push(values.join(' | '));
    }

    if (lines.length > 0) sheets.push(lines.join('\n'));
  }

  return sheets;
}

async function createOcrWorker(): Promise<any> {
  const tesseract = await importExternal(TESSERACT_URL);
  if (typeof tesseract.createWorker !== 'function') {
    throw new Error('Motore OCR non disponibile.');
  }
  return tesseract.createWorker('ita+eng');
}

async function readImageWithOcr(file: File): Promise<string[]> {
  const worker = await createOcrWorker();
  try {
    const result = await worker.recognize(file);
    return [String(result?.data?.text ?? '')];
  } finally {
    await worker.terminate();
  }
}

function pdfTextToLines(items: Array<{ str?: string; transform?: number[] }>): string {
  const positioned = items
    .map((item) => ({
      text: item.str?.trim() ?? '',
      x: item.transform?.[4] ?? 0,
      y: item.transform?.[5] ?? 0,
    }))
    .filter((item) => item.text);

  const rows: Array<{ y: number; items: Array<{ text: string; x: number }> }> = [];

  positioned.forEach((item) => {
    let row = rows.find((candidate) => Math.abs(candidate.y - item.y) <= 2.5);
    if (!row) {
      row = { y: item.y, items: [] };
      rows.push(row);
    }
    row.items.push({ text: item.text, x: item.x });
  });

  rows.sort((a, b) => b.y - a.y);

  return rows
    .map((row) => row.items
      .sort((a, b) => a.x - b.x)
      .map((item) => item.text)
      .join(' '))
    .join('\n');
}

async function readPdf(file: File): Promise<{ pages: string[]; usedOcr: boolean }> {
  const pdfjs = await importExternal(PDFJS_URL);
  if (!pdfjs.getDocument) throw new Error('Lettore PDF non disponibile.');
  if (pdfjs.GlobalWorkerOptions) pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pageTexts: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const textContent = await page.getTextContent();
    pageTexts.push(pdfTextToLines(textContent.items as Array<{ str?: string; transform?: number[] }>));
  }

  const candidate = bestValueFromPages(pageTexts);
  if (candidate?.kind === 'net') return { pages: pageTexts, usedOcr: false };

  const worker = await createOcrWorker();
  const ocrPages: string[] = [];
  try {
    const pagesToRead = pdf.numPages <= 8
      ? Array.from({ length: pdf.numPages }, (_, index) => index + 1)
      : Array.from(new Set([
          pdf.numPages,
          Math.max(1, pdf.numPages - 1),
          Math.max(1, pdf.numPages - 2),
          Math.max(1, pdf.numPages - 3),
        ]));

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
      ocrPages.push(String(result?.data?.text ?? ''));
    }
  } finally {
    await worker.terminate();
  }

  return { pages: [...pageTexts, ...ocrPages], usedOcr: true };
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
        candidate: bestValueFromPages(pdf.pages),
        method: pdf.usedOcr ? 'ocr' : 'pdf-text',
        warning: null,
      };
    }

    if (['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext) || file.type.startsWith('image/')) {
      const pages = await readImageWithOcr(file);
      return { candidate: bestValueFromPages(pages), method: 'ocr', warning: null };
    }

    if (ext === 'docx') {
      const pages = await readDocx(file);
      return { candidate: bestValueFromPages(pages), method: 'docx', warning: null };
    }

    if (ext === 'xlsx') {
      const pages = await readXlsx(file);
      return { candidate: bestValueFromPages(pages), method: 'xlsx', warning: null };
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
      confidence: extracted.candidate.kind === 'net' && extracted.candidate.score >= 200 ? 'high' : 'medium',
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
