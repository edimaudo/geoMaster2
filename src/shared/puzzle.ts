import type { DailyPuzzle, GeoLocation, PuzzleRound } from './types';

export type RandomSource = () => number;

export function mulberry32(seed: number): RandomSource {
  let value = seed >>> 0;
  return () => {
    value += 0x6D2B79F5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(items: T[], rng: RandomSource): T[] {
  const output = [...items];
  for (let i = output.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [output[i], output[j]] = [output[j], output[i]];
  }
  return output;
}

export function generateDailyPuzzle(date: string, seed: number, catalog: GeoLocation[]): DailyPuzzle {
  const rng = mulberry32(seed);
  const usedCountries = new Set<string>();
  const rounds: PuzzleRound[] = [];

  for (let tier = 1; tier <= 5; tier += 1) {
    let options = catalog.filter((location) => location.tier === tier);
    if (tier === 5 && new Date(`${date}T00:00:00.000Z`).getUTCDay() === 5) {
      const themed = options.filter((location) => Boolean(location.fridayTheme));
      if (themed.length > 0) options = themed;
    }
    const shuffled = seededShuffle(options, rng);
    const selected = shuffled.find((location) => !usedCountries.has(location.countryCode));
    if (!selected) {
      throw new Error(`Catalog cannot satisfy tier ${tier} with a unique country for ${date}.`);
    }
    usedCountries.add(selected.countryCode);
    rounds.push({
      round: tier,
      locationId: selected.id,
      locationName: selected.name,
      country: selected.country,
      continent: selected.continent,
      clueType: selected.clueType,
      lat: selected.lat,
      lng: selected.lng,
      tier: selected.tier,
      triviaTitle: selected.triviaTitle,
      triviaNote: selected.triviaNote,
    });
  }

  return {
    date,
    dispatchNumber: dispatchNumberForDate(date),
    rounds,
  };
}

export function dispatchNumberForDate(date: string): number {
  const start = Date.UTC(2026, 0, 1);
  const current = Date.parse(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(current)) throw new Error(`Invalid UTC date: ${date}`);
  return Math.max(1, Math.floor((current - start) / 86_400_000) + 1);
}
