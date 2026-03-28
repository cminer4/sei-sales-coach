import { createClient } from '@supabase/supabase-js';
import { getAssessmentBuilderBucket } from '@/lib/assessment-builder-storage';

export async function downloadAssessmentFile(storagePath: string): Promise<Buffer> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Missing Supabase configuration for downloads.');
  }
  const supabase = createClient(url, key);
  const bucket = getAssessmentBuilderBucket();
  const { data, error } = await supabase.storage.from(bucket).download(storagePath);
  if (error) {
    throw new Error(error.message);
  }
  return Buffer.from(await data.arrayBuffer());
}
