import { describe, expect, it } from 'vitest';
import catalogJson from '../assets/geo_catalog.json';
import { generateDailyPuzzle } from '../src/shared/puzzle';
import type { GeoLocation } from '../src/shared/types';

const catalog = catalogJson.locations as GeoLocation[];

describe('daily puzzle generation', () => {
  it('is deterministic for the same UTC date and seed', () => {
    const one = generateDailyPuzzle('2026-11-13', 284729, catalog);
    const two = generateDailyPuzzle('2026-11-13', 284729, catalog);
    expect(one).toEqual(two);
  });

  it('selects exactly five rounds in the prescribed tier order', () => {
    const puzzle = generateDailyPuzzle('2026-11-13', 284729, catalog);
    expect(puzzle.rounds).toHaveLength(5);
    expect(puzzle.rounds.map((round) => round.tier)).toEqual([1, 2, 3, 4, 5]);
  });

  it('never repeats a country within a daily puzzle', () => {
    const puzzle = generateDailyPuzzle('2026-11-13', 284729, catalog);
    expect(new Set(puzzle.rounds.map((round) => round.country)).size).toBe(5);
  });

  it('uses a Friday-themed round-five entry on Friday', () => {
    const puzzle = generateDailyPuzzle('2026-11-13', 284729, catalog);
    const selected = puzzle.rounds[4];
    const catalogItem = catalog.find((item) => item.id === selected.locationId);
    expect(catalogItem?.fridayTheme).toBeTruthy();
  });

  it('uses the same country-uniqueness rule on a non-Friday', () => {
    const puzzle = generateDailyPuzzle('2026-11-14', 284729, catalog);
    expect(puzzle.rounds).toHaveLength(5);
    expect(new Set(puzzle.rounds.map((round) => round.country)).size).toBe(5);
  });
});
