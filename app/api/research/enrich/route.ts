import { NextRequest, NextResponse } from 'next/server';
import { researchStore } from '@/lib/geopoliticalBrief/store';
import { fetchEnrichment } from '@/lib/geopoliticalBrief/perplexity';

type EnrichBody = {
  researchId: string;
  primaryBusiness: string;
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export async function POST(req: NextRequest) {
  let body: Partial<EnrichBody>;
  try {
    body = (await req.json()) as Partial<EnrichBody>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const fieldErrors: Record<string, string> = {};
  if (!isNonEmptyString(body.researchId)) fieldErrors.researchId = 'researchId is required';
  if (!isNonEmptyString(body.primaryBusiness)) fieldErrors.primaryBusiness = 'primaryBusiness is required';
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: 'Validation failed', details: fieldErrors }, { status: 400 });
  }

  const researchId = body.researchId!.trim();
  const primaryBusiness = body.primaryBusiness!.trim();

  const lookup = researchStore.get(researchId);
  if (!lookup.ok) {
    return NextResponse.json({ error: lookup.error.message }, { status: lookup.error.httpStatus });
  }

  const state = lookup.value;
  let enrichment = '';
  try {
    enrichment = await fetchEnrichment({
      company: state.onboarding.company,
      industry: state.onboarding.industry,
      regions: state.onboarding.regions,
      primaryBusiness,
    });
  } catch (err) {
    // TODO: wire to system_events
    console.error('[research/enrich] enrichment failed:', err);
    enrichment = '';
  }

  researchStore.update(researchId, { enrichment });
  return NextResponse.json({ ok: true });
}

