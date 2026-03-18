type ExposureLevel = 'high' | 'moderate' | 'low';
type ScenarioSeverity = 'high' | 'moderate' | 'low';
type ScenarioTag = 'baseline' | 'alternate' | 'contrarian';

export type BriefValidationResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

function isIsoTimestamp(v: unknown): v is string {
  return isNonEmptyString(v) && !Number.isNaN(Date.parse(v));
}

function isLevel(v: unknown): v is ExposureLevel {
  return v === 'high' || v === 'moderate' || v === 'low';
}

function isSeverity(v: unknown): v is ScenarioSeverity {
  return v === 'high' || v === 'moderate' || v === 'low';
}

function isTag(v: unknown): v is ScenarioTag {
  return v === 'baseline' || v === 'alternate' || v === 'contrarian';
}

export function validateBrief(brief: unknown): BriefValidationResult {
  if (!isRecord(brief)) return { ok: false, error: 'Brief must be an object' };

  if (!isNonEmptyString(brief.company)) return { ok: false, error: 'company is required' };
  if (!isIsoTimestamp(brief.generatedAt)) return { ok: false, error: 'generatedAt must be an ISO timestamp' };
  if (brief.horizon !== '12-18 months') return { ok: false, error: 'horizon must be "12-18 months"' };

  if (!Array.isArray(brief.regions) || brief.regions.length === 0 || !brief.regions.every(isNonEmptyString)) {
    return { ok: false, error: 'regions must be a non-empty array of strings' };
  }

  if (!isNonEmptyString(brief.scopeSummary)) return { ok: false, error: 'scopeSummary is required' };

  if (!Array.isArray(brief.exposures) || brief.exposures.length === 0) {
    return { ok: false, error: 'exposures must be a non-empty array' };
  }
  for (const e of brief.exposures) {
    if (!isRecord(e)) return { ok: false, error: 'exposures must be objects' };
    if (!isNonEmptyString(e.region)) return { ok: false, error: 'exposure.region is required' };
    if (!isLevel(e.level)) return { ok: false, error: 'exposure.level must be high|moderate|low' };
    if (typeof e.score !== 'number' || !Number.isInteger(e.score) || e.score < 1 || e.score > 5) {
      return { ok: false, error: 'exposure.score must be an integer 1-5' };
    }
    if (!isNonEmptyString(e.summary)) return { ok: false, error: 'exposure.summary is required' };
  }

  if (!Array.isArray(brief.scenarios) || brief.scenarios.length !== 4) {
    return { ok: false, error: 'scenarios must be an array of exactly 4 items' };
  }

  let probSum = 0;
  const tagCounts: Record<ScenarioTag, number> = { baseline: 0, alternate: 0, contrarian: 0 };

  for (const s of brief.scenarios) {
    if (!isRecord(s)) return { ok: false, error: 'scenarios must be objects' };
    if (!isNonEmptyString(s.name)) return { ok: false, error: 'scenario.name is required' };
    if (!isTag(s.tag)) return { ok: false, error: 'scenario.tag must be baseline|alternate|contrarian' };
    if (typeof s.probability !== 'number' || !Number.isInteger(s.probability) || s.probability < 0 || s.probability > 100) {
      return { ok: false, error: 'scenario.probability must be an integer 0-100' };
    }
    if (!isSeverity(s.severity)) return { ok: false, error: 'scenario.severity must be high|moderate|low' };
    if (!isNonEmptyString(s.narrative)) return { ok: false, error: 'scenario.narrative is required' };
    if (!Array.isArray(s.implications) || s.implications.length < 2 || !s.implications.every(isNonEmptyString)) {
      return { ok: false, error: 'scenario.implications must be an array with at least 2 strings' };
    }

    probSum += s.probability;
    tagCounts[s.tag] += 1;
  }

  if (probSum !== 100) return { ok: false, error: 'Scenario probabilities must sum to 100' };
  if (tagCounts.baseline !== 1 || tagCounts.contrarian !== 1 || tagCounts.alternate !== 2) {
    return {
      ok: false,
      error: 'Scenario tags must include 1 baseline, 2 alternate, and 1 contrarian',
    };
  }

  if (!Array.isArray(brief.monitoring) || brief.monitoring.length === 0) {
    return { ok: false, error: 'monitoring must be a non-empty array' };
  }
  for (const m of brief.monitoring) {
    if (!isRecord(m)) return { ok: false, error: 'monitoring items must be objects' };
    if (!isNonEmptyString(m.item)) return { ok: false, error: 'monitoring.item is required' };
    if (!isNonEmptyString(m.frequency)) return { ok: false, error: 'monitoring.frequency is required' };
  }

  return { ok: true, value: brief };
}

