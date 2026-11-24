export function playGameTone(kind: 'correct' | 'wrong', enabled: boolean): void {
  if (!enabled) return;
  try {
    const AudioContextConstructor = window.AudioContext;
    if (!AudioContextConstructor) return;
    const context = new AudioContextConstructor();
    const now = context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(kind === 'correct' ? 660 : 330, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'correct' ? 880 : 247, now + 0.18);
    oscillator.connect(gain);
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.022, now + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    oscillator.start(now);
    oscillator.stop(now + 0.23);
    oscillator.onended = () => { void context.close(); };
    if (context.state === 'suspended') void context.resume();
  } catch {
    // Audio is an enhancement; gameplay must continue when it is unavailable.
  }
}
