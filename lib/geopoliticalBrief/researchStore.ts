import { AllowedRegion } from './regions';

export interface ResearchOnboarding {
  name: string;
  role: string;
  company: string;
  industry: string;
  regions: AllowedRegion[];
}

export interface ResearchState {
  researchId: string;
  createdAt: string;
  onboarding: ResearchOnboarding;
  companyIntelligence: string;
  regionalSignals: string;
  enrichment: string;
}

type NowFn = () => Date;

export type ResearchStoreErrorCode = 'NOT_FOUND' | 'EXPIRED';

export type ResearchStoreResult =
  | { ok: true; value: ResearchState }
  | { ok: false; error: { code: ResearchStoreErrorCode; httpStatus: 404 | 410; message: string } };

export class ResearchStore {
  private readonly ttlMs: number;
  private now: NowFn;
  private readonly store = new Map<string, ResearchState>();
  private lastCleanupAtMs = 0;
  private readonly cleanupIntervalMs = 60_000;

  constructor(opts: { ttlMs: number; now?: NowFn }) {
    this.ttlMs = opts.ttlMs;
    this.now = opts.now ?? (() => new Date());
  }

  setNow(now: NowFn) {
    this.now = now;
  }

  create(input: Omit<ResearchState, 'researchId' | 'createdAt'>): { researchId: string } {
    const researchId = crypto.randomUUID();
    const createdAt = this.now().toISOString();

    const state: ResearchState = {
      researchId,
      createdAt,
      ...input,
    };
    this.store.set(researchId, state);
    this.maybeCleanup();
    return { researchId };
  }

  update(researchId: string, patch: Partial<Omit<ResearchState, 'researchId' | 'createdAt'>>) {
    const current = this.get(researchId);
    if (!current.ok) return current;

    const next: ResearchState = {
      ...current.value,
      ...patch,
    };
    this.store.set(researchId, next);
    return { ok: true as const, value: next };
  }

  get(researchId: string): ResearchStoreResult {
    const state = this.store.get(researchId);
    if (!state) {
      return {
        ok: false,
        error: {
          code: 'NOT_FOUND',
          httpStatus: 404,
          message: 'researchId not found. Please re-init research.',
        },
      };
    }

    const createdAtMs = Date.parse(state.createdAt);
    const ageMs = this.now().getTime() - createdAtMs;
    if (Number.isFinite(ageMs) && ageMs > this.ttlMs) {
      this.store.delete(researchId);
      return {
        ok: false,
        error: {
          code: 'EXPIRED',
          httpStatus: 410,
          message: 'researchId expired. Please re-init research.',
        },
      };
    }

    return { ok: true, value: state };
  }

  private maybeCleanup() {
    const nowMs = this.now().getTime();
    if (nowMs - this.lastCleanupAtMs < this.cleanupIntervalMs) return;
    this.lastCleanupAtMs = nowMs;

    for (const [id, state] of this.store.entries()) {
      const createdAtMs = Date.parse(state.createdAt);
      const ageMs = nowMs - createdAtMs;
      if (Number.isFinite(ageMs) && ageMs > this.ttlMs) {
        this.store.delete(id);
      }
    }
  }
}

