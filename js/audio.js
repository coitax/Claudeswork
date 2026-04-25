const Audio8Bit = (() => {
  let ctx = null;
  let muted = false;

  function getCtx() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function playTone(freq, duration, type, startTime, gain) {
    const c = getCtx();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    g.gain.value = gain || 0.15;
    g.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(g);
    g.connect(c.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  function correct() {
    if (muted) return;
    const c = getCtx();
    const t = c.currentTime;
    playTone(523, 0.1, 'square', t, 0.12);
    playTone(659, 0.1, 'square', t + 0.1, 0.12);
    playTone(784, 0.15, 'square', t + 0.2, 0.12);
  }

  function wrong() {
    if (muted) return;
    const c = getCtx();
    const t = c.currentTime;
    playTone(200, 0.15, 'sawtooth', t, 0.1);
    playTone(150, 0.2, 'sawtooth', t + 0.15, 0.1);
  }

  function levelUp() {
    if (muted) return;
    const c = getCtx();
    const t = c.currentTime;
    const notes = [523, 659, 784, 1047, 784, 1047, 1319];
    notes.forEach((n, i) => {
      playTone(n, 0.12, 'square', t + i * 0.1, 0.1);
    });
  }

  function achievement() {
    if (muted) return;
    const c = getCtx();
    const t = c.currentTime;
    playTone(784, 0.15, 'square', t, 0.1);
    playTone(988, 0.15, 'square', t + 0.15, 0.1);
    playTone(1175, 0.15, 'square', t + 0.3, 0.1);
    playTone(1319, 0.3, 'triangle', t + 0.45, 0.12);
  }

  function select() {
    if (muted) return;
    const c = getCtx();
    playTone(880, 0.05, 'square', c.currentTime, 0.08);
  }

  function bossIntro() {
    if (muted) return;
    const c = getCtx();
    const t = c.currentTime;
    playTone(220, 0.2, 'sawtooth', t, 0.12);
    playTone(220, 0.2, 'sawtooth', t + 0.25, 0.12);
    playTone(220, 0.2, 'sawtooth', t + 0.5, 0.12);
    playTone(175, 0.4, 'sawtooth', t + 0.75, 0.15);
    playTone(196, 0.2, 'square', t + 1.15, 0.1);
    playTone(220, 0.3, 'square', t + 1.35, 0.12);
  }

  function toggleMute() {
    muted = !muted;
    return muted;
  }

  function isMuted() {
    return muted;
  }

  return { correct, wrong, levelUp, achievement, select, bossIntro, toggleMute, isMuted };
})();
