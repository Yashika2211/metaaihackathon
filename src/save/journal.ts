import { CREATURES, type CreatureId } from '../recognizer/creatures';

/** What the Shadow Journal remembers between visits. */
export interface JournalData {
  version: 1;
  creatures: CreatureId[];
  fablesCompleted: string[];
  /** Count of nights (sessions) the lantern has been lit. */
  nights: number;
  firstNight: string | null;
  lastNight: string | null;
  /** Whether the player has finished onboarding at least once. */
  onboarded: boolean;
}

const KEY = 'shadowfolk.journal.v1';

export const emptyJournal = (): JournalData => ({
  version: 1,
  creatures: [],
  fablesCompleted: [],
  nights: 0,
  firstNight: null,
  lastNight: null,
  onboarded: false,
});

/** Minimal storage interface so tests can inject a fake (and private mode can fail safely). */
export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function safeStorage(): KV | null {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    const probe = '__shadowfolk_probe__';
    s.setItem(probe, '1');
    s.getItem(probe);
    return s;
  } catch {
    return null;
  }
}

/**
 * The Shadow Journal: creatures met, fables finished, nights visited.
 * Every storage access is wrapped in try/catch; if storage is unavailable
 * the journal still works for the current session.
 */
export class Journal {
  data: JournalData;
  private store: KV | null;

  constructor(store?: KV | null) {
    this.store = store === undefined ? safeStorage() : store;
    this.data = this.load();
  }

  private load(): JournalData {
    try {
      const raw = this.store?.getItem(KEY);
      if (!raw) return emptyJournal();
      const parsed = JSON.parse(raw) as Partial<JournalData>;
      if (parsed.version !== 1) return emptyJournal();
      return {
        ...emptyJournal(),
        ...parsed,
        creatures: (parsed.creatures ?? []).filter((c): c is CreatureId => (CREATURES as readonly string[]).includes(c)),
        fablesCompleted: Array.isArray(parsed.fablesCompleted) ? parsed.fablesCompleted.filter((f) => typeof f === 'string') : [],
      };
    } catch {
      return emptyJournal();
    }
  }

  save(): boolean {
    try {
      this.store?.setItem(KEY, JSON.stringify(this.data));
      return !!this.store;
    } catch {
      return false;
    }
  }

  /** Called once per lantern lighting. */
  startNight(date = new Date()): void {
    const day = date.toISOString().slice(0, 10);
    this.data.nights += 1;
    this.data.firstNight ??= day;
    this.data.lastNight = day;
    this.save();
  }

  /** Returns true if this creature is new to the journal. */
  meet(id: CreatureId): boolean {
    if (this.data.creatures.includes(id)) return false;
    this.data.creatures.push(id);
    this.save();
    return true;
  }

  complete(fableId: string): boolean {
    this.data.onboarded = true;
    if (this.data.fablesCompleted.includes(fableId)) {
      this.save();
      return false;
    }
    this.data.fablesCompleted.push(fableId);
    this.save();
    return true;
  }

  markOnboarded(): void {
    if (!this.data.onboarded) {
      this.data.onboarded = true;
      this.save();
    }
  }

  get isReturning(): boolean {
    return this.data.nights > 1;
  }

  /** Index of tonight's teaser: rotates through the list one step per day. */
  static teaserIndex(count: number, date = new Date()): number {
    if (count <= 0) return 0;
    const day = Math.floor(date.getTime() / 86_400_000);
    return ((day % count) + count) % count;
  }
}
