export const EARTH_RADIUS_KM = 6371;

export interface LatLng {
  lat: number;
  lng: number;
}

export function isValidLatLng(value: LatLng): boolean {
  return Number.isFinite(value.lat)
    && Number.isFinite(value.lng)
    && value.lat >= -90
    && value.lat <= 90
    && value.lng >= -180
    && value.lng <= 180;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function scoreDistanceKm(distanceKm: number): number {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) return 0;
  if (distanceKm <= 25) return 1000;
  return Math.max(0, Math.round(1000 * Math.exp(-(distanceKm - 25) / 1800)));
}

export function sphericalCentroid(points: LatLng[]): LatLng | null {
  if (points.length === 0) return null;
  let x = 0;
  let y = 0;
  let z = 0;
  for (const point of points) {
    const lat = (point.lat * Math.PI) / 180;
    const lng = (point.lng * Math.PI) / 180;
    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
  }
  const length = Math.sqrt(x * x + y * y + z * z);
  if (length < 1e-12) return null;
  x /= length;
  y /= length;
  z /= length;
  return {
    lat: (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI,
    lng: (Math.atan2(y, x) * 180) / Math.PI,
  };
}

export function formatDistance(distanceKm: number | null): string {
  if (distanceKm === null || !Number.isFinite(distanceKm)) return 'No pin';
  return `${Math.round(distanceKm).toLocaleString()} km`;
}
