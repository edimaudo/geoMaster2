import { SettingsButton } from './GameSettings';

export function GameHeader({ mode, onOpenSettings }: { mode: string; onOpenSettings: () => void }): JSX.Element {
  return (
    <header className="gm-game-header">
      <div className="gm-game-brand">
        <span className="gm-brand-mark" aria-hidden="true">✦</span>
        <strong><span className="gm-brand-geo">geo</span><span className="gm-brand-master">Master</span></strong>
        <span className="gm-game-mode">{mode}</span>
      </div>
      <SettingsButton onClick={onOpenSettings} />
    </header>
  );
}
