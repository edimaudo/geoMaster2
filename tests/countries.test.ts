import { describe, expect, it } from 'vitest';
import countryData from '../assets/countries.json';
import {
  buildQuizQuestions,
  QUIZ_MODES,
  COUNTRIES,
  flagUrl,
} from '../src/shared/countries';

const sourceCountries = countryData.countries;

describe('original geoMaster country content', () => {
  it('contains the 56 source records from the original repository', () => {
    expect(COUNTRIES).toHaveLength(56);
    expect(sourceCountries).toHaveLength(56);
  });

  it('preserves unique two-letter country codes and required source fields', () => {
    expect(new Set(COUNTRIES.map((item) => item.code)).size).toBe(COUNTRIES.length);
    for (const country of COUNTRIES) {
      expect(country.code).toMatch(/^[a-z]{2}$/);
      expect(country.name).not.toBe('');
      expect(country.capital).not.toBe('');
      expect(country.gdp).not.toBe('');
      expect(country.pop).not.toBe('');
      expect(country.beer).not.toBe('');
    }
  });

  it('exposes the four original game modes', () => {
    expect(QUIZ_MODES.map((mode) => mode.id)).toEqual(['country', 'flag', 'capital', 'guesser']);
  });

  it('creates seven questions with four unique options and one correct answer each', () => {
    for (const mode of QUIZ_MODES) {
      const questions = buildQuizQuestions(mode.id, 7, () => 0.37);
      expect(questions).toHaveLength(7);
      expect(new Set(questions.map((question) => question.correct.code)).size).toBe(7);
      for (const question of questions) {
        expect(question.options).toHaveLength(4);
        expect(new Set(question.options.map((option) => option.code)).size).toBe(4);
        expect(question.options.some((option) => option.code === question.correct.code)).toBe(true);
      }
    }
  });

  it('uses the existing flag CDN path convention from the source project', () => {
    expect(flagUrl('ca')).toBe('https://flagcdn.com/w320/ca.png');
  });
});
