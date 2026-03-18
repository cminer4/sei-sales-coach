import { NextRequest, NextResponse } from 'next/server';
import { assertRegionsAllowed } from '@/lib/geopoliticalBrief/regions';
import { researchStore } from '@/lib/geopoliticalBrief/store';
import { fetchCompanyIntel, fetchRegionalSignals } from '@/lib/geopoliticalBrief/perplexity';

type InitBody = {
  name: string;
  role: string;
  company: string;
  industry: string;
  regions: string[];
};

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export async function POST(req: NextRequest) {
  let body: Partial<InitBody>;
  try {
    body = (await req.json()) as Partial<InitBody>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const name = body.name;
  const role = body.role;
  const company = body.company;
  const industry = body.industry;
  const regions = body.regions;

  const fieldErrors: Record<string, string> = {};
  if (!isNonEmptyString(name)) fieldErrors.name = 'name is required';
  if (!isNonEmptyString(role)) fieldErrors.role = 'role is required';
  if (!isNonEmptyString(company)) fieldErrors.company = 'company is required';
  if (!isNonEmptyString(industry)) fieldErrors.industry = 'industry is required';
  if (!Array.isArray(regions) || regions.length === 0) fieldErrors.regions = 'regions must be a non-empty array';

  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: 'Validation failed', details: fieldErrors }, { status: 400 });
  }

  try {
    assertRegionsAllowed(regions as string[]);
  } catch (e) {
    return NextResponse.json(
      { error: 'Validation failed', details: { regions: e instanceof Error ? e.message : String(e) } },
      { status: 400 }
    );
  }

  const { researchId } = researchStore.create({
    onboarding: {
      name: name!.trim(),
      role: role!.trim(),
      company: company!.trim(),
      industry: industry!.trim(),
      regions: regions as any,
    },
    companyIntelligence: '',
    regionalSignals: '',
    enrichment: '',
  });

  const [companyIntel, regionalSignals] = await Promise.all([
    (async () => {
      try {
        return await fetchCompanyIntel({
          company: company!.trim(),
          industry: industry!.trim(),
          regions: regions as any,
        });
      } catch (err) {
        // TODO: wire to system_events
        console.error('[research/init] company intel failed:', err);
        return '';
      }
    })(),
    (async () => {
      try {
        return await fetchRegionalSignals({ regions: regions as any });
      } catch (err) {
        // TODO: wire to system_events
        console.error('[research/init] regional signals failed:', err);
        return '';
      }
    })(),
  ]);

  researchStore.update(researchId, {
    companyIntelligence: companyIntel,
    regionalSignals,
  });

  return NextResponse.json({ researchId });
}

