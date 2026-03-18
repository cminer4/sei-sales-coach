import { ResearchStore } from './researchStore';

// MVP: in-memory only. Server restarts drop state.
export const researchStore = new ResearchStore({
  ttlMs: 30 * 60 * 1000,
});

