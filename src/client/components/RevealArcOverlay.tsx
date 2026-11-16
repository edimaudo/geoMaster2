import type { RoundResult } from '../../shared/types';
import { formatDistance } from '../../shared/geo';

interface Props { result: RoundResult; units: 'km' | 'mi' }

export function RevealArcOverlay({ result, units }: Props): JSX.Element {
  return (
    <div className="reveal-overlay" role="status" aria-live="polite">
      <div className="reveal-distance">
        <span className="reveal-distance-value">{formatDistance(result.distanceKm, units)} away</span>
        <span className="reveal-score">+{result.roundScore.toLocaleString()} pts</span>
      </div>
      <div className="reveal-detail">
        <span>{result.locationName}, {result.country}</span>
        <span>{result.crowdAvgDistanceKm === null ? 'Community average pending' : `Subreddit avg · ${formatDistance(result.crowdAvgDistanceKm, units)}`}</span>
      </div>
    </div>
  );
}
