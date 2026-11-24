import { SettingsButton } from './GameSettings';

export function GameHeader({ mode, onOpenSettings }: { mode: string; onOpenSettings: () => void }): JSX.Element {
  return (
    <header className="gm-game-header">
      <span className="gm-header-spacer" aria-hidden="true" />
      <h1 className="gm-game-title">{mode}</h1>
      <SettingsButton onClick={onOpenSettings} />
    </header>
  );
}
