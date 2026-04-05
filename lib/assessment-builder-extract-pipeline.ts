import prisma from '@/lib/prisma';
import { chunkTextIntoSegments } from '@/lib/assessment-builder-chunk';
import {
  detectExtractableKind,
  extractTextFromBuffer,
} from '@/lib/assessment-builder-extract-text';
import { downloadAssessmentFile } from '@/lib/assessment-builder-storage-read';
import { insertDocumentChunk, countChunksForDocument } from '@/lib/assessment-builder-store-chunks';
import { embedText } from '@/lib/embeddings';

export type ExtractPipelineResult = {
  processedDocuments: number;
  skippedDocuments: number;
  errors: string[];
};

/**
 * For each assessment document: skip if chunks exist; else download, extract, chunk, embed, insert.
 */
export async function runAssessmentExtractPipeline(params: {
  assessmentId: string;
  createdBy: string;
}): Promise<ExtractPipelineResult> {
  const assessment = await prisma.assessments.findFirst({
    where: { id: params.assessmentId, created_by: params.createdBy, deleted_at: null },
    include: { assessment_documents: true },
  });
  if (!assessment) {
    return { processedDocuments: 0, skippedDocuments: 0, errors: ['Assessment not found'] };
  }

  let processedDocuments = 0;
  let skippedDocuments = 0;
  const errors: string[] = [];

  for (const doc of assessment.assessment_documents) {
    const existing = await countChunksForDocument(doc.id);
    if (existing > 0) {
      skippedDocuments += 1;
      continue;
    }

    const kind = detectExtractableKind(doc.filename);
    if (!kind) {
      errors.push(`Unsupported file type: ${doc.filename}`);
      continue;
    }

    try {
      const buffer = await downloadAssessmentFile(doc.storage_path);
      const text = await extractTextFromBuffer(buffer, kind);
      await prisma.assessment_documents.update({
        where: { id: doc.id },
        data: { extracted_text: text },
      });

      const segments = chunkTextIntoSegments(text);
      if (segments.length === 0) {
        errors.push(`No extractable text for ${doc.filename}`);
        continue;
      }

      let idx = 0;
      for (const content of segments) {
        const embedding = await embedText(content);
        await insertDocumentChunk({
          assessmentId: params.assessmentId,
          documentId: doc.id,
          chunkIndex: idx,
          content,
          embedding,
        });
        idx += 1;
      }
      processedDocuments += 1;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(`${doc.filename}: ${msg}`);
    }
  }

  return { processedDocuments, skippedDocuments, errors };
}
