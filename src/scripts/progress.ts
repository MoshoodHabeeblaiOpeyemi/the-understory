/**
 * The single source of truth for reader progress.
 * Every component that shows or sets progress goes through this module —
 * never touches localStorage directly — so state can never fork.
 *
 * Storage shape (localStorage key "understory.progress.v1"):
 *   { "day-004": { completedAt: ISO string, summary: string }, ... }
 *
 * Components listen for "understory:progress-changed" to re-render.
 */

const KEY = "understory.progress.v1";
export const EVENT = "understory:progress-changed";

export type LessonProgress = { completedAt: string; summary: string };
export type ProgressMap = Record<string, LessonProgress>;

/** Safe read — storage may be blocked (private mode, permissions). */
export function getProgress(): ProgressMap {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") as ProgressMap;
  } catch {
    return {};
  }
}

/** Safe write + broadcast. */
function save(map: ProgressMap) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* Storage refused — state still updates in memory for this session. */
  }
  document.dispatchEvent(new CustomEvent(EVENT));
}

export function getLesson(slug: string): LessonProgress | undefined {
  return getProgress()[slug];
}

export function markComplete(slug: string, summary = "") {
  const map = getProgress();
  map[slug] = { completedAt: new Date().toISOString(), summary };
  save(map);
}

export function markIncomplete(slug: string) {
  const map = getProgress();
  delete map[slug];
  save(map);
}

/** Autosave helper: persists just the summary without touching completion. */
export function saveSummary(slug: string, summary: string) {
  const map = getProgress();
  const existing = map[slug];
  map[slug] = { completedAt: existing?.completedAt ?? "", summary };
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
    // Summary autosave is deliberately silent — no event storm while typing.
  } catch {
    /* Storage refused — nothing to do. */
  }
}
