import { NextRequest, NextResponse } from 'next/server';
import { assertRegionsAllowed } from '@/lib/geopoliticalBrief/regions';
import { researchStore } from '@/lib/geopoliticalBrief/store';
import { prepareForJsonParse } from '@/lib/geopoliticalBrief/prepareForJsonParse';
import { synthesizeBrief } from '@/lib/geopoliticalBrief/synthesizeBrief';
import { validateBrief } from '@/lib/geopoliticalBrief/validateBrief';

type GenerateBody = {
  researchId: string;
  company: string;
  role: string;
  industry: string;
  regions: string[];
  chatAnswers: {
    primaryBusiness: string;
    primaryExposure: string;
    recentDisruption: string;
    riskOwnership: string;
  };
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export async function POST(req: NextRequest) {
  let body: Partial<GenerateBody>;
  try {
    body = (await req.json()) as Partial<GenerateBody>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const fieldErrors: Record<string, string> = {};
  if (!isNonEmptyString(body.researchId)) fieldErrors.researchId = 'researchId is required';
  if (!isNonEmptyString(body.company)) fieldErrors.company = 'company is required';
  if (!isNonEmptyString(body.role)) fieldErrors.role = 'role is required';
  if (!isNonEmptyString(body.industry)) fieldErrors.industry = 'industry is required';
  if (!Array.isArray(body.regions) || body.regions.length === 0) fieldErrors.regions = 'regions must be a non-empty array';

  const chat = body.chatAnswers;
  if (!chat || typeof chat !== 'object') {
    fieldErrors.chatAnswers = 'chatAnswers is required';
  } else {
    if (!isNonEmptyString(chat.primaryBusiness)) fieldErrors['chatAnswers.primaryBusiness'] = 'required';
    if (!isNonEmptyString(chat.primaryExposure)) fieldErrors['chatAnswers.primaryExposure'] = 'required';
    if (!isNonEmptyString(chat.recentDisruption)) fieldErrors['chatAnswers.recentDisruption'] = 'required';
    if (!isNonEmptyString(chat.riskOwnership)) fieldErrors['chatAnswers.riskOwnership'] = 'required';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: 'Validation failed', details: fieldErrors }, { status: 400 });
  }

  try {
    assertRegionsAllowed(body.regions as string[]);
  } catch (e) {
    return NextResponse.json(
      { error: 'Validation failed', details: { regions: e instanceof Error ? e.message : String(e) } },
      { status: 400 }
    );
  }

  const researchId = body.researchId!.trim();
  const lookup = researchStore.get(researchId);
  if (!lookup.ok) {
    return NextResponse.json({ error: lookup.error.message }, { status: lookup.error.httpStatus });
  }

  const retryInstruction =
    'Your previous response was not valid JSON. Return only the JSON object with no other text.';

  const session = {
    company: body.company!.trim(),
    role: body.role!.trim(),
    industry: body.industry!.trim(),
    regions: body.regions as any,
    chatAnswers: {
      primaryBusiness: chat!.primaryBusiness.trim(),
      primaryExposure: chat!.primaryExposure.trim(),
      recentDisruption: chat!.recentDisruption.trim(),
      riskOwnership: chat!.riskOwnership.trim(),
    },
  };

  const research = {
    companyIntelligence: lookup.value.companyIntelligence,
    regionalSignals: lookup.value.regionalSignals,
    enrichment: lookup.value.enrichment,
  };

  let rawFirst = '';
  let rawRetry: string | undefined;

  try {
    rawFirst = await synthesizeBrief({ session, research });
    const strippedFirst = prepareForJsonParse(rawFirst);
    let parsed: unknown;
    try {
      parsed = JSON.parse(strippedFirst);
    } catch (err) {
      rawRetry = await synthesizeBrief({ session, research, retryInstruction });
      const strippedRetry = prepareForJsonParse(rawRetry);
      try {
        parsed = JSON.parse(strippedRetry);
      } catch (err2) {
        console.error('[brief/generate] malformed JSON from Claude. rawFirst:', rawFirst);
        console.error('[brief/generate] malformed JSON from Claude (retry). rawRetry:', rawRetry);
        return NextResponse.json(
          {
            error: 'Brief synthesis response could not be parsed as JSON',
            rawResponse: rawFirst,
            rawResponseRetry: rawRetry,
          },
          { status: 500 }
        );
      }
    }

    const validation = validateBrief(parsed);
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: 'Brief synthesis returned invalid JSON shape',
          details: validation.error,
          rawResponse: rawFirst,
          rawResponseRetry: rawRetry,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(validation.value);
  } catch (err) {
    // TODO: wire to system_events
    console.error('[brief/generate] fatal error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: message, rawResponse: rawFirst || undefined, rawResponseRetry: rawRetry },
      { status: 500 }
    );
  }
}

