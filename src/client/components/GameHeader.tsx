interface GameHeaderProps { mode: string; }

export function GameHeader({ mode }: GameHeaderProps): JSX.Element {
  return (
    <header className="gm-game-header">
      <h1 className="gm-game-title">{mode}</h1>
    </header>
  );
}

export function GameNavigation({ onBack, onOpenSettings }: { onBack: () => void; onOpenSettings: () => void }): JSX.Element {
  return (
    <nav className="game-bottom-nav" aria-label="Game navigation">
      <button className="game-bottom-button game-bottom-all" type="button" onClick={onBack}>All Games</button>
      <button className="game-bottom-button game-bottom-settings" type="button" onClick={onOpenSettings}>Settings</button>
    </nav>
  );
}
