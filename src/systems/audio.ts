/**
 * Sound system.
 *
 * The prototype ships without audio assets (they would bloat the classroom
 * download). Every event is synthesised with the Web Audio API instead, so the
 * game never breaks when a file is missing — the hooks below would simply be
 * swapped for <audio>/buffer playback with a try/catch fallback.
 */

export type SoundEvent =
  | 'CARD_DRAW'
  | 'CARD_SELECT'
  | 'CARD_PLAY'
  | 'SWORD_ATTACK'
  | 'MAGIC_CAST'
  | 'BOSS_ATTACK'
  | 'BOSS_HIT'
  | 'PLAYER_HIT'
  | 'PHASE_CHANGE'
  | 'VICTORY';

/** Optional override map — drop real files in `assets/audio` and register them here. */
export const SOUND_SOURCES: Partial<Record<SoundEvent, string>> = {
  // CARD_DRAW: '/assets/audio/card_draw.mp3',
  // VICTORY: '/assets/audio/victory.mp3',
};

let ctx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function setMuted(value: boolean) {
  muted = value;
}

export function isMuted() {
  return muted;
}

interface ToneOptions {
  freq: number;
  to?: number;
  dur?: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone({ freq, to, dur = 0.18, type = 'sine', gain = 0.14, delay = 0 }: ToneOptions) {
  const audio = getCtx();
  if (!audio) return;
  try {
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    const t0 = audio.currentTime + delay;
    osc.type = type;
    osc.frequency.setValueAtTime(Math.max(20, freq), t0);
    if (to && to !== freq) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t0 + dur);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(amp).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  } catch {
    /* audio unavailable — silently ignore */
  }
}

function noise(dur = 0.25, gain = 0.12, delay = 0, filterFreq = 1200) {
  const audio = getCtx();
  if (!audio) return;
  try {
    const frames = Math.floor(audio.sampleRate * dur);
    const buffer = audio.createBuffer(1, frames, audio.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    const src = audio.createBufferSource();
    src.buffer = buffer;
    const filter = audio.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const amp = audio.createGain();
    amp.gain.value = gain;
    src.connect(filter).connect(amp).connect(audio.destination);
    src.start(audio.currentTime + delay);
  } catch {
    /* ignore */
  }
}

const RECIPES: Record<SoundEvent, () => void> = {
  CARD_DRAW: () => {
    noise(0.16, 0.07, 0, 2600);
    tone({ freq: 520, to: 880, dur: 0.12, type: 'triangle', gain: 0.07 });
  },
  CARD_SELECT: () => tone({ freq: 720, to: 940, dur: 0.09, type: 'square', gain: 0.05 }),
  CARD_PLAY: () => {
    tone({ freq: 380, to: 640, dur: 0.16, type: 'triangle', gain: 0.1 });
    noise(0.2, 0.05, 0.02, 1800);
  },
  SWORD_ATTACK: () => {
    noise(0.22, 0.16, 0, 3400);
    tone({ freq: 1400, to: 320, dur: 0.18, type: 'sawtooth', gain: 0.08 });
  },
  MAGIC_CAST: () => {
    tone({ freq: 440, to: 1600, dur: 0.32, type: 'sine', gain: 0.1 });
    tone({ freq: 660, to: 2200, dur: 0.3, type: 'triangle', gain: 0.05, delay: 0.04 });
  },
  BOSS_ATTACK: () => {
    tone({ freq: 150, to: 40, dur: 0.5, type: 'sawtooth', gain: 0.18 });
    noise(0.4, 0.16, 0.05, 700);
  },
  BOSS_HIT: () => {
    noise(0.22, 0.15, 0, 1400);
    tone({ freq: 220, to: 90, dur: 0.2, type: 'square', gain: 0.1 });
  },
  PLAYER_HIT: () => {
    tone({ freq: 190, to: 70, dur: 0.3, type: 'sawtooth', gain: 0.14 });
    noise(0.24, 0.1, 0, 900);
  },
  PHASE_CHANGE: () => {
    tone({ freq: 520, dur: 0.14, type: 'sine', gain: 0.07 });
    tone({ freq: 780, dur: 0.16, type: 'sine', gain: 0.07, delay: 0.09 });
  },
  VICTORY: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({ freq: f, dur: 0.4, type: 'triangle', gain: 0.11, delay: i * 0.13 }),
    );
  },
};

export function playSound(event: SoundEvent) {
  if (muted) return;
  try {
    const recipe = RECIPES[event];
    if (recipe) recipe();
  } catch {
    /* never let audio break the game */
  }
}

export function unlockAudio() {
  getCtx();
}
