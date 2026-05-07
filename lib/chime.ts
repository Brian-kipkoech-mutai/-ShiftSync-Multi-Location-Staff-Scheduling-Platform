export function playNotificationChime() {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    const notes = [1046.5, 830.6]; // C6, Ab5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      const start = ctx.currentTime + i * 0.12;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.18, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
      osc.start(start);
      osc.stop(start + 0.6);
    });

    setTimeout(() => ctx.close(), 1500);
  } catch {
    // AudioContext unavailable (SSR or blocked by browser policy)
  }
}
