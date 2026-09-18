import { MAX_FILE_SIZE_BYTES } from './constants';

// ---------------------------------------------------------------------------
// Document extraction — actually reads file contents client-side.
// Kept behind a small function-based abstraction so a real backend
// extraction service could replace this later without touching callers.
// ---------------------------------------------------------------------------

export const SUPPORTED_EXTENSIONS = ['.pdf', '.docx', '.txt', '.md'];

export function getExtension(filename) {
  const idx = filename.lastIndexOf('.');
  return idx === -1 ? '' : filename.slice(idx).toLowerCase();
}

export function validateFile(file) {
  const ext = getExtension(file.name);
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return { ok: false, error: `${ext || 'This file type'} isn't supported. Upload a PDF, DOCX, TXT, or Markdown file.` };
  }
  if (file.size === 0) {
    return { ok: false, error: 'This file is empty.' };
  }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, error: `This file is larger than ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB. Upload a smaller file.` };
  }
  return { ok: true };
}

async function extractTxt(file) {
  const text = await file.text();
  return text;
}

async function extractPdf(file) {
  const pdfjsLib = await import('pdfjs-dist');
  // Vite serves the worker from node_modules via the ?url import convention.
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  let doc;
  try {
    doc = await pdfjsLib.getDocument({ data: buffer }).promise;
  } catch (err) {
    if (String(err?.name).includes('Password') || /password/i.test(String(err?.message))) {
      throw new Error('This PDF is password-protected. Upload an unprotected file.');
    }
    throw new Error('This PDF could not be read. It may be corrupted or scanned as images without text.');
  }

  const pages = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ').trim();
    pages.push({ page: i, text: pageText });
  }

  const combined = pages.map((p) => p.text).join('\n').trim();
  if (!combined) {
    throw new Error('No readable text was found in this PDF. It may be a scanned document without selectable text.');
  }
  return { text: combined, pages };
}

async function extractDocx(file) {
  const mammoth = await import('mammoth');
  const buffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer: buffer });
  const text = (result.value || '').trim();
  if (!text) {
    throw new Error('No readable text was found in this document.');
  }
  return text;
}

/**
 * Extract usable text from a supported file.
 * @returns {Promise<{ text: string, pages?: Array<{page:number,text:string}> }>}
 */
export async function extractTextFromFile(file) {
  const ext = getExtension(file.name);
  switch (ext) {
    case '.txt':
    case '.md':
      return { text: await extractTxt(file) };
    case '.pdf':
      return extractPdf(file);
    case '.docx':
      return { text: await extractDocx(file) };
    default:
      throw new Error(`${ext} is not a supported file type.`);
  }
}

// ---------------------------------------------------------------------------
// URL "analysis" — this prototype has no live web-fetch backend, so remote
// retrieval is kept behind this single function. Recognized demo URLs return
// a deterministic seeded result; anything else returns an explicit
// demo-limitation error rather than pretending to fetch a real page.
// ---------------------------------------------------------------------------

const DEMO_URL_SEEDS = {
  'acme.dev': "Acme is a DevOps suite that helps engineering teams run cloud compute jobs and use AI to analyze deployments, logs, and incidents. Customers range from individual developers experimenting with the product to scaling engineering organizations and large enterprises with security, support, and procurement requirements.",
};

export function isValidUrl(value) {
  if (!value) return false;
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    return Boolean(url.hostname && url.hostname.includes('.'));
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<{ text: string } | { demoLimitation: true, message: string }>}
 */
export async function analyzeUrl(rawUrl) {
  const url = new URL(rawUrl.includes('://') ? rawUrl : `https://${rawUrl}`);
  const host = url.hostname.replace(/^www\./, '');
  const seed = Object.entries(DEMO_URL_SEEDS).find(([domain]) => host.endsWith(domain));
  if (seed) {
    return { text: seed[1] };
  }
  return {
    demoLimitation: true,
    message: `This prototype can't fetch live websites yet — there's no connected retrieval service. Try acme.dev for a seeded demo result, or paste a business description instead.`,
  };
}
