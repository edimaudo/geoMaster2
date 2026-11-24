import { describe, expect, it } from 'vitest';
import { formatDistance, haversineKm, scoreDistanceKm, sphericalCentroid } from '../src/shared/geo';

describe('geo calculations', () => {
  it('returns zero for the same coordinate', () => {
    expect(haversineKm({ lat: 43.6532, lng: -79.3832 }, { lat: 43.6532, lng: -79.3832 })).toBe(0);
  });

  it('handles the antimeridian using the short great-circle path', () => {
    const distance = haversineKm({ lat: 0, lng: 179 }, { lat: 0, lng: -179 });
    expect(distance).toBeGreaterThan(220);
    expect(distance).toBeLessThan(225);
  });

  it('applies the PRD grace radius and exponential distance decay', () => {
    expect(scoreDistanceKm(25)).toBe(1000);
    expect(scoreDistanceKm(150)).toBe(933);
    expect(scoreDistanceKm(500)).toBe(768);
    expect(scoreDistanceKm(2000)).toBe(334);
    expect(scoreDistanceKm(-1)).toBe(0);
  });

  it('calculates a spherical centroid near the antimeridian', () => {
    const centroid = sphericalCentroid([{ lat: 0, lng: 179 }, { lat: 0, lng: -179 }]);
    expect(centroid).not.toBeNull();
    expect(Math.abs(centroid!.lng)).toBeGreaterThan(179);
    expect(Math.abs(centroid!.lat)).toBeLessThan(0.001);
  });

  it('formats distances in the selected unit', () => {
    expect(formatDistance(100)).toBe('100 km');
    expect(formatDistance(null)).toBe('No pin');
  });
});
