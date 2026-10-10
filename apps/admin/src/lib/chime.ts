/**
 * A short two-note chime for new orders, synthesised with Web Audio (no sound file to load).
 * Browsers only allow sound after the user has interacted with the page, hence `unlock()`.
 */
let ctx: AudioContext | null = null;

export function unlockSound() {
  ctx ??= new AudioContext();
  return ctx.resume().then(() => ctx!.state === "running");
}

export const soundReady = () => ctx?.state === "running";

export function chime() {
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  [880, 1318.5].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + i * 0.18);
    gain.gain.exponentialRampToValueAtTime(0.35, now + i * 0.18 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.5);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(now + i * 0.18);
    osc.stop(now + i * 0.18 + 0.55);
  });
}
