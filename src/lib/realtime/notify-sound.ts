let unlocked = false;
let sharedCtx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!sharedCtx) sharedCtx = new AC();
  return sharedCtx;
}

/** Call once after a user gesture so later notification sounds are allowed. */
export function unlockNotifySound() {
  if (unlocked) return;
  const ctx = getCtx();
  if (!ctx) return;
  void ctx.resume().then(() => {
    unlocked = true;
  });
}

/** Short chime for new notifications (Web Audio — no asset file). */
export function playNotifySound() {
  try {
    const ctx = getCtx();
    if (!ctx) return;
    void ctx.resume();

    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    gain.connect(ctx.destination);

    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.connect(gain);
    osc1.start(now);
    osc1.stop(now + 0.35);

    const osc2 = ctx.createOscillator();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1174.7, now + 0.08);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.0001, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.08, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.4);

    unlocked = true;
  } catch {
    // Autoplay or AudioContext unavailable — ignore.
  }
}
