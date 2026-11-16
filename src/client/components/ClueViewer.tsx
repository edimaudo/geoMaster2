import { useState } from 'react';
import type { PublicRound } from '../../shared/types';

interface Props { round: PublicRound }

export function ClueViewer({ round }: Props): JSX.Element {
  const [zoomed, setZoomed] = useState(false);
  return (
    <section className={`clue-viewer ${zoomed ? 'is-zoomed' : ''}`} aria-label={`Coordinate clue, round ${round.round}`}>
      <div className="clue-north" aria-label="North is up"><span>N</span><i /></div>
      <button
        className="clue-zoom"
        type="button"
        onClick={() => setZoomed((value) => !value)}
        aria-label={zoomed ? 'Zoom out of clue' : 'Zoom in on clue'}
        aria-pressed={zoomed}
      >
        {zoomed ? '−' : '+'}
      </button>
      <img src={round.clueUrl} alt={round.clueAlt} draggable={false} />
      <div className="clue-vignette" aria-hidden="true" />
      <div className="clue-label"><span>VISUAL CLUE</span><span>R{round.round} / 05</span></div>
    </section>
  );
}
