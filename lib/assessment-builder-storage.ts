import { createClient } from '@supabase/supabase-js';

const BUCKET =
  process.env.ASSESSMENT_BUILDER_STORAGE_BUCKET ?? 'assessment-uploads';

export function getAssessmentBuilderBucket(): string {
  return BUCKET;
}

export function sanitizeAssessmentFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '_');
}

export async function uploadAssessmentDocument(params: {
  assessmentId: string;
  file: File;
}): Promise<{ storagePath: string }> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase configuration for uploads.');
  }
  const supabase = createClient(url, key);
  const safeName = sanitizeAssessmentFilename(params.file.name);
  const storagePath = `assessments/${params.assessmentId}/${safeName}`;
  const buf = Buffer.from(await params.file.arrayBuffer());
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buf, {
      contentType: params.file.type || 'application/octet-stream',
      upsert: true,
    });
  if (error) {
    throw new Error(error.message);
  }
  return { storagePath };
}
