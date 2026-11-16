import { describe, expect, it } from 'vitest';
import catalogJson from '../assets/geo_catalog.json';
import type { GeoLocation } from '../src/shared/types';

const locations = catalogJson.locations as GeoLocation[];

describe('starter content catalog', () => {
  it('has five entries in each of the five tiers', () => {
    const counts = [1, 2, 3, 4, 5].map((tier) => locations.filter((location) => location.tier === tier).length);
    expect(counts).toEqual([5, 5, 5, 5, 5]);
  });

  it('uses unique IDs and country codes in the starter pack', () => {
    expect(new Set(locations.map((location) => location.id)).size).toBe(locations.length);
    expect(new Set(locations.map((location) => location.countryCode)).size).toBe(locations.length);
  });

  it('keeps every coordinate within valid world bounds', () => {
    for (const location of locations) {
      expect(location.lat).toBeGreaterThanOrEqual(-90);
      expect(location.lat).toBeLessThanOrEqual(90);
      expect(location.lng).toBeGreaterThanOrEqual(-180);
      expect(location.lng).toBeLessThanOrEqual(180);
      expect(location.clueAsset).toMatch(/^c_[a-f0-9]+\.svg$/);
    }
  });
});
