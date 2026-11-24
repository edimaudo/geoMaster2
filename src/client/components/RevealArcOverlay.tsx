import type { RoundResult } from '../../shared/types';
import { formatDistance } from '../../shared/geo';

interface Props { result: RoundResult }

export function RevealArcOverlay({ result }: Props): JSX.Element {
  return (
    <div className="reveal-overlay" role="status" aria-live="polite">
      <div className="reveal-distance">
        <span className="reveal-distance-value">{formatDistance(result.distanceKm)} away</span>
        <span className="reveal-score">+{result.roundScore.toLocaleString()} pts</span>
      </div>
      <div className="reveal-detail">
        <span>{result.locationName}, {result.country}</span>
        <span>{result.crowdAvgDistanceKm === null ? 'Community average pending' : `Community avg · ${formatDistance(result.crowdAvgDistanceKm)}`}</span>
      </div>
    </div>
  );
}
