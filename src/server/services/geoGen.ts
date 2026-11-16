import { createHash } from 'node:crypto';
import geoCatalogJson from '../../../assets/geo_catalog.json';
import { generateDailyPuzzle } from '../../shared/puzzle';
import type { DailyPuzzle, GeoLocation } from '../../shared/types';

const catalog = geoCatalogJson.locations as GeoLocation[];

export function utcDateString(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function isIsoDate(value: unknown): value is string {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00.000Z`));
}

export function seedForDate(date: string, serverSalt: string): number {
  if (!serverSalt || serverSalt.length < 24) {
    throw new Error('Configure a server salt with at least 24 characters before generating a daily puzzle.');
  }
  const digest = createHash('sha256').update(`${date}:${serverSalt}`).digest('hex');
  return Number.parseInt(digest.slice(0, 8), 16) >>> 0;
}

export function buildDailyPuzzle(date: string, serverSalt: string): DailyPuzzle {
  return generateDailyPuzzle(date, seedForDate(date, serverSalt), catalog);
}

export function getCatalogSize(): number {
  return catalog.length;
}
