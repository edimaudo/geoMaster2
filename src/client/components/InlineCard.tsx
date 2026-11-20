import { useEffect, useState } from 'react';
import type React from 'react';
import { requestExpandedMode } from '@devvit/web/client';
import type { InitResponse } from '../../shared/types';

interface ErrorBody { error?: string }

async function getInit(): Promise<InitResponse> {
  const response = await fetch('/api/init');
  const payload = await response.json() as InitResponse & ErrorBody;
  if (!response.ok) throw new Error(payload.error || 'Could not load today’s challenge.');
  return payload;
}

function dateStamp(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(parsed);
}

export function InlineCard(): JSX.Element {
  const [data, setData] = useState<InitResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getInit()
      .then((payload) => { if (active) setData(payload); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load today’s challenge.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const playLabel = 'Open geoMaster';
  const statusLine = data?.status === 'COMPLETED'
    ? `Completed · ${data.totalScore.toLocaleString()} pts${data.percentileTop ? ` · Top ${data.percentileTop}%` : ''}`
    : data?.status === 'IN_PROGRESS'
      ? `Resume Round ${Math.min(data.currentRound, 5)} of 5`
      : '5 daily coordinates · same puzzle for everyone';

  const handlePlay = (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      requestExpandedMode(event.nativeEvent, 'game', { title: 'geoMaster' });
    } catch (reason) {
      console.error('[geoMaster] could not open the game', reason);
      setError('geoMaster could not be opened. Try again.');
    }
  };



  return (
    <main className="inline-shell" aria-label="geoMaster game post">
      <header className="inline-header">
        <div className="brand-lockup">geoMaster</div>
        <span className="dispatch-chip">Dispatch #{String(data?.dispatchNumber ?? 1).padStart(3, '0')}</span>
        <time className="inline-date">{data ? dateStamp(data.date) : 'UTC Daily'}</time>
      </header>

      <section className="inline-preview" aria-label="Today’s geographic challenge">
        <div className="preview-graticule" aria-hidden="true" />
        <div className="preview-orbit orbit-one" aria-hidden="true" />
        <div className="preview-orbit orbit-two" aria-hidden="true" />
        <div className="preview-crosshair" aria-hidden="true"><span /><span /></div>
        <div className="preview-caption">
          
          <h1>Five places.<br />One world.</h1>
          <p>{loading ? 'Preparing today’s coordinates…' : statusLine}</p>
        </div>
        <div className="preview-coordinates" aria-hidden="true"><span>00° 00′ N</span><span>000° 00′ E</span></div>
      </section>

      <footer className="inline-footer">
        {error && <p className="inline-error" role="alert">{error}</p>}
        <button className="primary-button inline-play" type="button" onClick={handlePlay}>
          <span>{playLabel}</span><span aria-hidden="true">↗</span>
        </button>
        <div className="inline-bottom-row">
          <div className="inline-meta">
            <span>{data ? `${data.playedToday.toLocaleString()} played today` : 'A new daily challenge'}</span>
            {data && data.streak > 0 && <span className="streak-pill">{data.streak}-day streak</span>}
            {data?.geoMasterAvgDistanceKm !== null && data?.geoMasterAvgDistanceKm !== undefined && (
              <span>geoMaster avg · {Math.round(data.geoMasterAvgDistanceKm).toLocaleString()} km</span>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
}
