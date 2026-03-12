// Simple notification sound previews using Web Audio API
const AudioContext = window.AudioContext || (window as any).webkitAudioContext;

let audioCtx: AudioContext | null = null;

function getCtx() {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', gain = 0.3) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gain, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playNotificationSound(sound: string) {
  try {
    switch (sound) {
      case 'kaching': {
        // Cash register: two bright tones
        playTone(1200, 0.15, 'square', 0.2);
        setTimeout(() => playTone(1800, 0.3, 'square', 0.25), 100);
        break;
      }
      case 'coin': {
        // Coin drop: ascending ping
        playTone(800, 0.1, 'sine', 0.3);
        setTimeout(() => playTone(1400, 0.25, 'sine', 0.2), 80);
        break;
      }
      case 'cash': {
        // Money: smooth sweep
        const ctx = getCtx();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(400, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.2);
        g.gain.setValueAtTime(0.3, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
        break;
      }
      case 'bell': {
        // Bell: clear ring
        playTone(1046, 0.5, 'sine', 0.3);
        playTone(2093, 0.3, 'sine', 0.1);
        break;
      }
      case 'success': {
        // Success: ascending chord
        playTone(523, 0.2, 'sine', 0.2);
        setTimeout(() => playTone(659, 0.2, 'sine', 0.2), 120);
        setTimeout(() => playTone(784, 0.4, 'sine', 0.25), 240);
        break;
      }
      case 'magic': {
        // Magic: sparkle effect
        [0, 50, 100, 150].forEach((delay, i) => {
          setTimeout(() => playTone(1200 + i * 300, 0.15, 'sine', 0.15), delay);
        });
        break;
      }
      case 'pop': {
        // Pop: short burst
        playTone(600, 0.08, 'square', 0.25);
        setTimeout(() => playTone(900, 0.12, 'sine', 0.2), 60);
        break;
      }
      case 'none':
      default:
        break;
    }
  } catch (e) {
    console.warn('Could not play sound:', e);
  }
}
