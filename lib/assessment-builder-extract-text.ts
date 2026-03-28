import mammoth from 'mammoth';

export type ExtractableKind = 'pdf' | 'docx' | 'txt';

export function detectExtractableKind(filename: string): ExtractableKind | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (lower.endsWith('.docx')) return 'docx';
  if (lower.endsWith('.txt')) return 'txt';
  return null;
}

export async function extractTextFromBuffer(
  buffer: Buffer,
  kind: ExtractableKind,
): Promise<string> {
  if (kind === 'pdf') {
    // Dynamic import: pdf-parse loads test fixtures at module top-level (breaks Next bundle).
    const pdfParse = (await import('pdf-parse')).default as (b: Buffer) => Promise<{ text?: string }>;
    const data = await pdfParse(buffer);
    return (data.text ?? '').replace(/\s+/g, ' ').trim();
  }
  if (kind === 'docx') {
    const result = await mammoth.extractRawText({ buffer });
    return (result.value ?? '').trim();
  }
  return buffer.toString('utf8');
}
