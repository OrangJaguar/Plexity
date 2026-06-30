import { useCallback, useEffect, useRef } from 'react';

export const FOCUS_AMBIENT_SOUNDS = [
  { id: 'off', label: 'Off' },
  { id: 'rain', label: 'Rain' },
  { id: 'brown', label: 'Brown noise' },
  { id: 'white', label: 'White noise' },
  { id: 'cafe', label: 'Café' },
  { id: 'forest', label: 'Forest' },
  { id: 'space', label: 'Space' },
];

const LOOP_FILES = {
  rain: '/audio/focus/rain.ogg',
  cafe: '/audio/focus/cafe.ogg',
  space: '/audio/focus/space.ogg',
};

function buildNoiseBuffer(ctx, kind, seconds = 4) {
  const length = ctx.sampleRate * seconds;
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);

  for (let ch = 0; ch < 2; ch += 1) {
    const data = buffer.getChannelData(ch);
    let brown = 0;
    for (let i = 0; i < length; i += 1) {
      const white = Math.random() * 2 - 1;
      if (kind === 'white') {
        data[i] = white * 0.55;
      } else {
        brown = (brown + 0.02 * white) / 1.02;
        const gain = kind === 'brown' ? 3.2
          : kind === 'cafe' ? 2.4
          : kind === 'forest' ? 2.0
          : 1.6;
        data[i] = brown * gain;
      }
    }
  }

  return buffer;
}

function connectFilteredNoise(ctx, buffer, { type = 'lowpass', frequency = 800, Q = 0.7, gain = 0.35 }) {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = frequency;
  filter.Q.value = Q;
  const out = ctx.createGain();
  out.gain.value = gain;
  source.connect(filter);
  filter.connect(out);
  source.start();
  return { output: out, stop: () => source.stop() };
}

function scheduleRainDrops(ctx, destination, timers) {
  const scheduleDrop = () => {
    const delay = 40 + Math.random() * 180;
    const id = window.setTimeout(() => {
      const osc = ctx.createOscillator();
      const noise = ctx.createBufferSource();
      const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.04), ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      }
      noise.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 1200 + Math.random() * 2200;
      bp.Q.value = 2.5;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.08 + Math.random() * 0.06, ctx.currentTime + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.05);
      noise.connect(bp);
      bp.connect(g);
      g.connect(destination);
      noise.start();
      osc.connect(g);
      scheduleDrop();
    }, delay);
    timers.push(id);
  };
  scheduleDrop();
}

function createRainSound(ctx) {
  const mix = ctx.createGain();
  mix.gain.value = 1;
  const buffer = buildNoiseBuffer(ctx, 'rain', 6);

  const layers = [
    connectFilteredNoise(ctx, buffer, { type: 'lowpass', frequency: 420, Q: 0.5, gain: 0.45 }),
    connectFilteredNoise(ctx, buffer, { type: 'bandpass', frequency: 1100, Q: 0.55, gain: 0.28 }),
    connectFilteredNoise(ctx, buffer, { type: 'highpass', frequency: 2800, Q: 0.4, gain: 0.12 }),
  ];

  layers.forEach((layer) => layer.output.connect(mix));

  const shimmer = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmer.type = 'sine';
  shimmer.frequency.value = 0.08;
  shimmerGain.gain.value = 180;
  shimmer.connect(shimmerGain);
  shimmerGain.connect(layers[1].output.gain);
  shimmer.start();

  const timers = [];
  scheduleRainDrops(ctx, mix, timers);

  return {
    output: mix,
    stop: () => {
      timers.forEach((id) => window.clearTimeout(id));
      layers.forEach((l) => l.stop());
      shimmer.stop();
    },
  };
}

function createCafeSound(ctx) {
  const mix = ctx.createGain();
  mix.gain.value = 1;

  const buffer = buildNoiseBuffer(ctx, 'brown', 8);
  const air = connectFilteredNoise(ctx, buffer, { type: 'lowpass', frequency: 320, Q: 0.4, gain: 0.14 });
  const room = connectFilteredNoise(ctx, buffer, { type: 'bandpass', frequency: 520, Q: 0.35, gain: 0.1 });
  const hiss = connectFilteredNoise(ctx, buffer, { type: 'highpass', frequency: 2400, Q: 0.25, gain: 0.025 });

  air.output.connect(mix);
  room.output.connect(mix);
  hiss.output.connect(mix);

  const murmurLfo = ctx.createOscillator();
  const murmurDepth = ctx.createGain();
  murmurLfo.type = 'sine';
  murmurLfo.frequency.value = 0.18;
  murmurDepth.gain.value = 0.06;
  murmurLfo.connect(murmurDepth);
  murmurDepth.connect(room.output.gain);
  murmurLfo.start();

  const timers = [];
  const scheduleMurmur = () => {
    const delay = 900 + Math.random() * 2200;
    const id = window.setTimeout(() => {
      const len = Math.floor(ctx.sampleRate * (0.18 + Math.random() * 0.35));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) {
        const env = Math.sin((i / len) * Math.PI);
        data[i] = (Math.random() * 2 - 1) * env * 0.35;
      }
      const burst = ctx.createBufferSource();
      burst.buffer = buf;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 280 + Math.random() * 900;
      filter.Q.value = 0.55;
      const g = ctx.createGain();
      g.gain.value = 0.05 + Math.random() * 0.04;
      burst.connect(filter);
      filter.connect(g);
      g.connect(mix);
      burst.start();
      scheduleMurmur();
    }, delay);
    timers.push(id);
  };
  scheduleMurmur();

  const scheduleClink = () => {
    const delay = 2800 + Math.random() * 5200;
    const id = window.setTimeout(() => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800 + Math.random() * 1200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(900, ctx.currentTime + 0.08);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.018, ctx.currentTime + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.connect(g);
      g.connect(mix);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
      scheduleClink();
    }, delay);
    timers.push(id);
  };
  scheduleClink();

  return {
    output: mix,
    stop: () => {
      timers.forEach((timerId) => window.clearTimeout(timerId));
      air.stop();
      room.stop();
      hiss.stop();
      murmurLfo.stop();
    },
  };
}

function createSpaceSound(ctx) {
  const mix = ctx.createGain();
  mix.gain.value = 1;

  const noiseBuffer = buildNoiseBuffer(ctx, 'brown', 6);
  const bed = connectFilteredNoise(ctx, noiseBuffer, { type: 'lowpass', frequency: 180, Q: 0.5, gain: 0.12 });
  bed.output.connect(mix);

  const freqs = [55, 82.5, 110, 165];
  const oscillators = freqs.map((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = i % 2 === 0 ? 'sine' : 'triangle';
    osc.frequency.value = freq + (Math.random() - 0.5) * 1.5;
    const g = ctx.createGain();
    g.gain.value = 0.09 / (i + 1);
    osc.connect(g);
    g.connect(mix);
    osc.start();
    return { osc, g };
  });

  const drift = ctx.createOscillator();
  const driftDepth = ctx.createGain();
  drift.type = 'sine';
  drift.frequency.value = 0.03;
  driftDepth.gain.value = 6;
  drift.connect(driftDepth);
  driftDepth.connect(oscillators[0].osc.frequency);
  drift.start();

  const sweep = ctx.createOscillator();
  const sweepDepth = ctx.createGain();
  sweep.frequency.value = 0.06;
  sweepDepth.gain.value = 90;
  sweep.connect(sweepDepth);
  sweepDepth.connect(oscillators[2].g.gain);
  sweep.start();

  const shimmer = ctx.createOscillator();
  const shimmerGain = ctx.createGain();
  shimmer.type = 'sine';
  shimmer.frequency.value = 880;
  shimmerGain.gain.value = 0.008;
  shimmer.connect(shimmerGain);
  shimmerGain.connect(mix);
  shimmer.start();

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 520;
  filter.Q.value = 0.35;
  mix.connect(filter);

  const delay = ctx.createDelay(3);
  delay.delayTime.value = 0.62;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.42;
  const delayMix = ctx.createGain();
  delayMix.gain.value = 0.55;
  filter.connect(delay);
  delay.connect(feedback);
  feedback.connect(delay);
  delay.connect(delayMix);
  delayMix.connect(filter);

  const out = ctx.createGain();
  out.gain.value = 1.1;
  filter.connect(out);
  delayMix.connect(out);

  return {
    output: out,
    stop: () => {
      oscillators.forEach(({ osc }) => osc.stop());
      drift.stop();
      sweep.stop();
      shimmer.stop();
      bed.stop();
    },
  };
}

function createSimpleNoiseSound(ctx, soundId) {
  const buffer = buildNoiseBuffer(ctx, soundId === 'rain' ? 'brown' : soundId);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const filter = ctx.createBiquadFilter();
  if (soundId === 'forest') {
    filter.type = 'lowpass';
    filter.frequency.value = 650;
  } else if (soundId === 'white') {
    filter.type = 'lowpass';
    filter.frequency.value = 8000;
  } else {
    filter.type = 'lowpass';
    filter.frequency.value = soundId === 'brown' ? 500 : 500;
  }

  source.connect(filter);
  source.start();
  return { output: filter, stop: () => source.stop() };
}

function createAmbientNode(ctx, soundId) {
  if (soundId === 'rain') return createRainSound(ctx);
  if (soundId === 'cafe') return createCafeSound(ctx);
  if (soundId === 'space') return createSpaceSound(ctx);
  return createSimpleNoiseSound(ctx, soundId);
}

async function tryLoadLoopFile(ctx, soundId) {
  const url = LOOP_FILES[soundId];
  if (!url) return null;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.loop = true;
    source.start();
    return { output: source, stop: () => source.stop() };
  } catch {
    return null;
  }
}

export function useFocusAmbientSound(soundId, volume = 0.5, enabled = true) {
  const ctxRef = useRef(null);
  const nodeRef = useRef(null);
  const gainRef = useRef(null);
  const mountedRef = useRef(true);

  const stop = useCallback(() => {
    nodeRef.current?.stop?.();
    nodeRef.current = null;
    gainRef.current = null;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled || !soundId || soundId === 'off') {
      stop();
      return undefined;
    }

    const ctx = ctxRef.current || new AudioContext();
    ctxRef.current = ctx;
    if (ctx.state === 'suspended') ctx.resume();

    stop();

    let cancelled = false;

    const startSound = async () => {
      let node = await tryLoadLoopFile(ctx, soundId);
      if (cancelled) return;
      if (!node) {
        node = createAmbientNode(ctx, soundId);
      }
      if (cancelled) {
        node.stop();
        return;
      }

      const gain = ctx.createGain();
      gain.gain.value = Math.max(0, Math.min(1, volume));
      node.output.connect(gain);
      gain.connect(ctx.destination);
      nodeRef.current = node;
      gainRef.current = gain;
    };

    void startSound();

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, soundId, stop]);

  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = Math.max(0, Math.min(1, volume));
    }
  }, [volume]);

  useEffect(() => () => {
    stop();
    ctxRef.current?.close?.();
    ctxRef.current = null;
  }, [stop]);

  return { stop };
}
