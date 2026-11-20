import { useMemo, useRef, useState } from 'react';
import type React from 'react';
import { geoInterpolate, geoMercator, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import world from 'world-atlas/countries-110m.json';
import type { RoundResult } from '../../shared/types';

interface LatLng { lat: number; lng: number }
interface Props {
  pin?: LatLng | null;
  reveal?: RoundResult | null;
  interactive?: boolean;
  onPinChange?: (point: LatLng) => void;
  compact?: boolean;
}

interface DragState { pointerId: number; x: number; y: number; originX: number; originY: number; moved: boolean }
interface PointerPoint { x: number; y: number }
interface PinchState { initialDistance: number; initialZoom: number }

const WIDTH = 1000;
const HEIGHT = 460;
const topo = world as unknown as { objects: { countries: unknown } };
const countryFeatures = feature(world as never, topo.objects.countries as never) as unknown as {
  features: Array<{ type: 'Feature'; geometry: unknown; properties?: Record<string, unknown> }>;
};

function projectedPath(lat: number, lng: number, project: ReturnType<typeof geoMercator>): [number, number] | null {
  return project([lng, lat]) as [number, number] | null;
}

export function VectorMap({ pin = null, reveal = null, interactive = false, onPinChange, compact = false }: Props): JSX.Element {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const pointersRef = useRef<Map<number, PointerPoint>>(new Map());
  const pinchRef = useRef<PinchState | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const projection = useMemo(() => geoMercator()
    .scale(157 * zoom)
    .translate([WIDTH / 2 + pan.x, HEIGHT / 2 + pan.y])
    .clipExtent([[0, 0], [WIDTH, HEIGHT]]), [pan.x, pan.y, zoom]);
  const path = useMemo(() => geoPath(projection), [projection]);
  const landPaths = useMemo(() => countryFeatures.features
    .map((item, index) => ({ id: index, d: path(item as never) || '' }))
    .filter((item) => Boolean(item.d)), [path]);

  const userPoint = reveal?.guessLat !== null && reveal?.guessLat !== undefined && reveal.guessLng !== null
    ? { lat: reveal.guessLat, lng: reveal.guessLng }
    : pin;
  const truePoint = reveal ? { lat: reveal.targetLat, lng: reveal.targetLng } : null;
  const crowdPoint = reveal?.crowdCentroidLat !== null && reveal?.crowdCentroidLat !== undefined
    && reveal.crowdCentroidLng !== null
    ? { lat: reveal.crowdCentroidLat, lng: reveal.crowdCentroidLng }
    : null;

  const userXY = userPoint ? projectedPath(userPoint.lat, userPoint.lng, projection) : null;
  const targetXY = truePoint ? projectedPath(truePoint.lat, truePoint.lng, projection) : null;
  const crowdXY = crowdPoint ? projectedPath(crowdPoint.lat, crowdPoint.lng, projection) : null;
  const arcPath = useMemo(() => {
    if (!reveal || reveal.guessLat === null || reveal.guessLng === null) return '';
    const interpolate = geoInterpolate(
      [reveal.guessLng, reveal.guessLat],
      [reveal.targetLng, reveal.targetLat],
    );
    const coordinates = Array.from({ length: 72 }, (_, index) => interpolate(index / 71));
    return path({ type: 'LineString', coordinates } as never) || '';
  }, [path, reveal]);

  const mapCoordinate = (clientX: number, clientY: number): LatLng | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const bounds = svg.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return null;
    const x = ((clientX - bounds.left) / bounds.width) * WIDTH;
    const y = ((clientY - bounds.top) / bounds.height) * HEIGHT;
    const point = projection.invert([x, y]);
    if (!point || !Number.isFinite(point[0]) || !Number.isFinite(point[1])) return null;
    const lng = ((point[0] + 540) % 360) - 180;
    const lat = Math.max(-85, Math.min(85, point[1]));
    return { lat, lng };
  };

  const handleMapKeyDown = (event: React.KeyboardEvent<SVGSVGElement>) => {
    if (!interactive || reveal || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    const current = pin ?? { lat: 0, lng: 0 };
    const step = event.shiftKey ? 10 : 1;
    let lat = current.lat;
    let lng = current.lng;
    if (event.key === 'ArrowUp') lat += step;
    if (event.key === 'ArrowDown') lat -= step;
    if (event.key === 'ArrowRight') lng += step;
    if (event.key === 'ArrowLeft') lng -= step;
    if (lng > 180) lng -= 360;
    if (lng < -180) lng += 360;
    const nextPoint = { lat: Math.max(-85, Math.min(85, lat)), lng };
    const projected = projectedPath(nextPoint.lat, nextPoint.lng, projection);
    if (projected) {
      setPan((currentPan) => ({
        x: currentPan.x + WIDTH / 2 - projected[0],
        y: currentPan.y + HEIGHT / 2 - projected[1],
      }));
    }
    onPinChange?.(nextPoint);
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || reveal) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);

    if (pointersRef.current.size >= 2) {
      const points = Array.from(pointersRef.current.values()).slice(0, 2);
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      pinchRef.current = {
        initialDistance: Math.max(1, Math.sqrt(dx * dx + dy * dy)),
        initialZoom: zoom,
      };
      dragRef.current = null;
      return;
    }

    dragRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      originX: pan.x,
      originY: pan.y,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!interactive || !pointersRef.current.has(event.pointerId)) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointersRef.current.size >= 2 && pinchRef.current) {
      const points = Array.from(pointersRef.current.values()).slice(0, 2);
      const dx = points[0].x - points[1].x;
      const dy = points[0].y - points[1].y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const nextZoom = pinchRef.current.initialZoom * (distance / pinchRef.current.initialDistance);
      setZoom(Math.max(0.8, Math.min(2.6, nextZoom)));
      return;
    }

    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
    if (drag.moved) {
      const bounds = svgRef.current?.getBoundingClientRect();
      if (!bounds) return;
      setPan({
        x: drag.originX + (dx / bounds.width) * WIDTH,
        y: drag.originY + (dy / bounds.height) * HEIGHT,
      });
    }
  };

  const handlePointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    const pointerCount = pointersRef.current.size;
    const wasPinching = pinchRef.current !== null;
    const drag = dragRef.current;
    if (!wasPinching && pointerCount === 1 && drag && drag.pointerId === event.pointerId && !drag.moved) {
      const coordinate = mapCoordinate(event.clientX, event.clientY);
      if (coordinate) onPinChange?.(coordinate);
    }
    pointersRef.current.delete(event.pointerId);
    if (wasPinching || pointerCount <= 1) {
      pinchRef.current = null;
      dragRef.current = null;
    }
  };

  const handlePointerCancel = (event: React.PointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId);
    pinchRef.current = null;
    dragRef.current = null;
  };

  return (
    <section className={`map-wrap ${compact ? 'map-compact' : ''} ${interactive ? 'map-interactive' : ''}`} aria-label={interactive ? 'Interactive world map. Tap to place a pin, drag to pan.' : 'World map showing your guess, the true location, and the community centroid.'}>
      <svg
        ref={svgRef}
        className="world-map"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role={interactive && !reveal ? 'application' : 'img'}
        aria-label={interactive && !reveal
          ? 'Interactive world map. Use arrow keys to move the pin one degree at a time; hold Shift to move ten degrees. You can also tap or click the map and drag to pan.'
          : 'World map with country borders and latitude-longitude graticule'}
        tabIndex={interactive && !reveal ? 0 : undefined}
        onKeyDown={handleMapKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <defs>
          <pattern id="map-contours" width="94" height="62" patternUnits="userSpaceOnUse">
            <path d="M-8 34 C14 10 40 10 56 28 S94 48 108 22 M-12 48 C12 24 34 26 52 42 S92 60 112 36" fill="none" stroke="var(--map-contour)" strokeWidth="1.2" opacity=".55" />
          </pattern>
          <pattern id="map-graticule" width="125" height="92" patternUnits="userSpaceOnUse">
            <path d="M0 0H125M0 0V92" stroke="var(--map-grid)" strokeWidth="1" fill="none" />
          </pattern>
          <filter id="pin-shadow" x="-100%" y="-100%" width="300%" height="300%"><feDropShadow dx="0" dy="5" stdDeviation="5" floodOpacity=".3" /></filter>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="var(--map-water)" />
        <rect width={WIDTH} height={HEIGHT} fill="url(#map-graticule)" />
        <g className="map-countries">
          {landPaths.map((item) => <path key={item.id} d={item.d} />)}
        </g>
        <rect width={WIDTH} height={HEIGHT} fill="url(#map-contours)" opacity=".42" pointerEvents="none" />
        {arcPath && <path className="geodesic-arc" d={arcPath} />}
        {crowdXY && <g className="crowd-marker" transform={`translate(${crowdXY[0]},${crowdXY[1]})`}><circle r="12" /><circle r="4" /></g>}
        {targetXY && <g className="target-marker" transform={`translate(${targetXY[0]},${targetXY[1]})`}><circle r="15" /><path d="M0 -7V7M-7 0H7" /></g>}
        {userXY && <g className="user-marker" transform={`translate(${userXY[0]},${userXY[1]})`} filter="url(#pin-shadow)"><path d="M0 17C-4 9 -15 -1 -15 -11A15 15 0 1 1 15 -11C15 -1 4 9 0 17Z" /><circle cy="-11" r="5" /></g>}
      </svg>
      {interactive && !reveal && (
        <div className="map-controls" role="group" aria-label="Map zoom controls">
          <button type="button" onClick={() => setZoom((value) => Math.max(0.8, +(value - 0.2).toFixed(2)))} aria-label="Zoom out">−</button>
          <button type="button" onClick={() => setZoom((value) => Math.min(2.6, +(value + 0.2).toFixed(2)))} aria-label="Zoom in">+</button>
          <button type="button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} aria-label="Reset map view">↺</button>
        </div>
      )}
      <div className="map-legend">
        {reveal ? <><span><i className="legend-dot legend-user" />Your pin</span><span><i className="legend-dot legend-target" />Target</span><span><i className="legend-dot legend-crowd" />Crowd</span></> : <span><i className="legend-dot legend-user" />Your pin</span>}
      </div>
      {interactive && !pin && !reveal && <div className="map-prompt" aria-hidden="true">Tap anywhere to drop your pin</div>}
    </section>
  );
}
