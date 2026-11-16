import countryData from '../../assets/countries.json';

export interface CountryRecord {
  code: string;
  name: string;
  capital: string;
  gdp: string;
  pop: string;
  beer: string;
}

export type ClassicGameMode = 'country' | 'flag' | 'capital' | 'guesser';

export const COUNTRIES = countryData.countries as CountryRecord[];

export const CLASSIC_MODES: Array<{
  id: ClassicGameMode;
  title: string;
  description: string;
}> = [
  { id: 'country', title: 'Country Mode', description: 'Country name to flag' },
  { id: 'flag', title: 'Flag Mode', description: 'Flag to country name' },
  { id: 'capital', title: 'Capital Mode', description: 'Capital to flag' },
  { id: 'guesser', title: 'Guesser Mode', description: 'Facts to country name' },
];

export function flagUrl(countryCode: string): string {
  return `https://flagcdn.com/w320/${countryCode.toLowerCase()}.png`;
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function buildClassicQuestions(
  mode: ClassicGameMode,
  count = 7,
  random: () => number = Math.random,
): Array<{ correct: CountryRecord; options: CountryRecord[] }> {
  if (!Number.isInteger(count) || count < 1 || count > COUNTRIES.length) {
    throw new RangeError(`Question count must be between 1 and ${COUNTRIES.length}.`);
  }
  if (!CLASSIC_MODES.some((item) => item.id === mode)) {
    throw new Error(`Unsupported classic game mode: ${mode}`);
  }

  const selected = shuffle(COUNTRIES, random).slice(0, count);
  return selected.map((correct) => {
    const distractors = shuffle(COUNTRIES.filter((item) => item.code !== correct.code), random).slice(0, 3);
    return { correct, options: shuffle([correct, ...distractors], random) };
  });
}
