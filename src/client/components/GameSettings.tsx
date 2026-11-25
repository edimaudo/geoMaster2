import { useEffect, useRef } from 'react';

export type ThemeChoice = 'dark' | 'light';
export type TextSizeChoice = 'small' | 'medium' | 'large';

interface SettingsProps {
  soundEnabled: boolean;
  theme: ThemeChoice;
  textSize: TextSizeChoice;
  onSoundChange: (value: boolean) => void;
  onThemeChange: (value: ThemeChoice) => void;
  onTextSizeChange: (value: TextSizeChoice) => void;
  onClose: () => void;
}

export function GameSettings({
  soundEnabled, theme, textSize, onSoundChange, onThemeChange, onTextSizeChange, onClose,
}: SettingsProps): JSX.Element {
  const panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.querySelector<HTMLElement>('button')?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const controls = Array.from(panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'));
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { window.removeEventListener('keydown', handleKeyDown); previousFocus?.focus(); };
  }, [onClose]);

  return (
    <div className="gm-settings-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section ref={panelRef} className="gm-settings-panel" role="dialog" aria-modal="true" aria-labelledby="gm-settings-title">
        <header className="gm-settings-heading">
          <div>
            <h2 id="gm-settings-title">Settings</h2>
            <p>Adjust how geoMaster looks and sounds.</p>
          </div>
          <button className="gm-settings-close" type="button" onClick={onClose} aria-label="Close settings">×</button>
        </header>

        <div className="gm-setting-row">
          <div><strong>Sound</strong><span>Answer and game feedback sounds</span></div>
          <div className="gm-segmented" role="group" aria-label="Sound setting">
            <button type="button" aria-pressed={soundEnabled} className={soundEnabled ? 'active' : ''} onClick={() => onSoundChange(true)}>On</button>
            <button type="button" aria-pressed={!soundEnabled} className={!soundEnabled ? 'active' : ''} onClick={() => onSoundChange(false)}>Off</button>
          </div>
        </div>

        <div className="gm-setting-row">
          <div><strong>Appearance</strong><span>Choose a colour theme</span></div>
          <div className="gm-segmented" role="group" aria-label="Colour theme">
            <button type="button" aria-pressed={theme === 'light'} className={theme === 'light' ? 'active' : ''} onClick={() => onThemeChange('light')}>Light</button>
            <button type="button" aria-pressed={theme === 'dark'} className={theme === 'dark' ? 'active' : ''} onClick={() => onThemeChange('dark')}>Dark</button>
          </div>
        </div>

        <div className="gm-setting-row gm-setting-row-text">
          <div><strong>Text size</strong><span>Applies throughout the game</span></div>
          <div className="gm-segmented" role="group" aria-label="Text size">
            {(['small', 'medium', 'large'] as const).map((size) => (
              <button key={size} type="button" aria-pressed={textSize === size} className={textSize === size ? 'active' : ''} onClick={() => onTextSizeChange(size)}>
                {size[0].toUpperCase() + size.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <button className="gm-settings-done" type="button" onClick={onClose}>Done</button>
      </section>
    </div>
  );
}
