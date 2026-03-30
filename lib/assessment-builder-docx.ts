import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from 'docx';
import type { DraftContent } from '@/lib/assessment-builder-draft-types';

const SECTION_ORDER: { key: keyof DraftContent; title: string }[] = [
  { key: 'findings', title: 'Discovery Findings' },
  { key: 'interviews', title: 'Stakeholder Interviews' },
  { key: 'hypothesis', title: 'Hypothesis Brief' },
  { key: 'stakeholder_map', title: 'Stakeholder Map' },
  { key: 'opportunities', title: 'Opportunity Shortlist' },
];

function stripTags(s: string): string {
  return s
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Inline HTML fragment to TextRuns — preserves bold from strong/b. */
export function textRunsFromHtmlFragment(html: string): TextRun[] {
  const trimmed = html.trim();
  if (!trimmed) return [new TextRun('')];
  const runs: TextRun[] = [];
  const re = /<(strong|b)>([\s\S]*?)<\/\1>/gi;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(trimmed)) !== null) {
    const before = trimmed.slice(lastIndex, match.index);
    const plainBefore = stripTags(before);
    if (plainBefore) runs.push(new TextRun(plainBefore));
    runs.push(new TextRun({ text: stripTags(match[2]), bold: true }));
    lastIndex = match.index + match[0].length;
  }
  const tail = trimmed.slice(lastIndex);
  const plainTail = stripTags(tail);
  if (plainTail) runs.push(new TextRun(plainTail));
  return runs.length ? runs : [new TextRun(stripTags(trimmed))];
}

/** Section body HTML to Paragraphs — list items as bullets; else split on closing </p>. */
export function paragraphsFromSectionHtml(html: string): Paragraph[] {
  const htmlTrim = html.trim() || '<p></p>';
  const items: Paragraph[] = [];
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi;
  const lis: string[] = [];
  let lm: RegExpExecArray | null;
  while ((lm = liRe.exec(htmlTrim)) !== null) {
    lis.push(lm[1]);
  }
  if (lis.length > 0) {
    for (const li of lis) {
      items.push(
        new Paragraph({
          bullet: { level: 0 },
          children: textRunsFromHtmlFragment(li),
        }),
      );
    }
    return items;
  }
  const blocks = htmlTrim
    .split(/<\/p>/i)
    .map((b) => b.replace(/^[\s\S]*?<p[^>]*>/i, '').trim())
    .filter((b) => stripTags(b));
  if (blocks.length === 0) {
    items.push(new Paragraph({ children: textRunsFromHtmlFragment(htmlTrim) }));
    return items;
  }
  for (const block of blocks) {
    items.push(new Paragraph({ children: textRunsFromHtmlFragment(block) }));
  }
  return items;
}

export type AssessmentDocxMeta = {
  clientName: string;
};

/**
 * Word document: SEI header, client, date, then five section headings and body (HTML stripped with bold/bullets where practical).
 */
export function buildAssessmentDocx(
  assessment: AssessmentDocxMeta,
  draftContent: DraftContent,
): Document {
  const client = assessment.clientName.trim() || 'Client';
  const dateStr = new Date().toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const headerParas: Paragraph[] = [
    new Paragraph({
      children: [
        new TextRun({
          text: 'SEI Management Consulting — Discovery Assessment',
          bold: true,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      text: 'AI Readiness Discovery Report',
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${client} · ${dateStr} · Confidential`,
        }),
      ],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ text: '' }),
  ];

  const bodyParas: Paragraph[] = [];
  for (const { key, title } of SECTION_ORDER) {
    const html = draftContent[key] ?? '';
    bodyParas.push(
      new Paragraph({
        text: title,
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200 },
      }),
    );
    bodyParas.push(...paragraphsFromSectionHtml(html));
  }

  return new Document({
    sections: [
      {
        properties: {},
        children: [...headerParas, ...bodyParas],
      },
    ],
  });
}

export async function packAssessmentDocx(doc: Document): Promise<Buffer> {
  return Buffer.from(await Packer.toBuffer(doc));
}

/** Safe filename for Content-Disposition: `[ClientName]-Discovery-Assessment.docx` */
export function discoveryAssessmentFilename(clientName: string): string {
  const safe = clientName
    .replace(/[^a-zA-Z0-9 _-]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 80);
  const base = safe || 'Assessment';
  return `${base}-Discovery-Assessment.docx`;
}
