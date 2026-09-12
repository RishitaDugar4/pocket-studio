"use client";

import type { AudioTrack } from "@/types";
import { encodeWav } from "./wav";

/**
 * The built-in sound library.
 *
 * Every sound here is synthesised in the browser from oscillators and noise —
 * nothing is sampled, downloaded or licensed from anyone. That is deliberate:
 * previs needs a sound to mark "something happens here", not a recording, and
 * generating them means the library can ship with no copyright surface at all.
 * Anything real is an upload or a microphone take.
 */
export interface SoundDefinition {
  id: string;
  name: string;
  description: string;
  track: AudioTrack;
  duration: number;
  build: (context: OfflineAudioContext) => void;
}

const SAMPLE_RATE = 44100;

/* --------------------------------------------------------------- utilities */

function noiseBuffer(context: BaseAudioContext, seconds: number, tilt = 0): AudioBuffer {
  const length = Math.ceil(seconds * context.sampleRate);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < length; i += 1) {
    const white = Math.random() * 2 - 1;
    // `tilt` rolls the noise darker, which is what most real ambience sounds like.
    last = last * tilt + white * (1 - tilt);
    data[i] = last;
  }
  return buffer;
}

function noiseSource(context: OfflineAudioContext, seconds: number, tilt = 0): AudioBufferSourceNode {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context, seconds, tilt);
  source.loop = true;
  return source;
}

interface HitOptions {
  at: number;
  gain: number;
  decay: number;
  frequency: number;
  type?: OscillatorType;
  /** Adds a noise transient on top — what makes a thump sound like an impact. */
  noise?: number;
  noiseFilter?: number;
}

function hit(context: OfflineAudioContext, options: HitOptions) {
  const { at, gain, decay, frequency, type = "sine", noise = 0, noiseFilter = 2000 } = options;

  const oscillator = context.createOscillator();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency * 1.6, at);
  oscillator.frequency.exponentialRampToValueAtTime(frequency, at + decay * 0.6);

  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, at);
  envelope.gain.exponentialRampToValueAtTime(gain, at + 0.006);
  envelope.gain.exponentialRampToValueAtTime(0.0001, at + decay);

  oscillator.connect(envelope).connect(context.destination);
  oscillator.start(at);
  oscillator.stop(at + decay + 0.05);

  if (noise > 0) {
    const source = noiseSource(context, 0.4);
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = noiseFilter;
    filter.Q.value = 0.8;

    const noiseEnvelope = context.createGain();
    noiseEnvelope.gain.setValueAtTime(0.0001, at);
    noiseEnvelope.gain.exponentialRampToValueAtTime(noise, at + 0.004);
    noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, at + decay * 0.7);

    source.connect(filter).connect(noiseEnvelope).connect(context.destination);
    source.start(at);
    source.stop(at + decay + 0.05);
  }
}

/** A steady bed of filtered noise — the backbone of every ambience. */
function bed(
  context: OfflineAudioContext,
  options: { seconds: number; gain: number; lowpass: number; highpass?: number; tilt?: number },
) {
  const source = noiseSource(context, 2.5, options.tilt ?? 0.92);

  const low = context.createBiquadFilter();
  low.type = "lowpass";
  low.frequency.value = options.lowpass;

  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, 0);
  envelope.gain.linearRampToValueAtTime(options.gain, 0.6);
  envelope.gain.setValueAtTime(options.gain, options.seconds - 0.6);
  envelope.gain.linearRampToValueAtTime(0.0001, options.seconds);

  let chain: AudioNode = source.connect(low);
  if (options.highpass) {
    const high = context.createBiquadFilter();
    high.type = "highpass";
    high.frequency.value = options.highpass;
    chain = chain.connect(high);
  }
  chain.connect(envelope).connect(context.destination);

  source.start(0);
  source.stop(options.seconds);
}

function tone(
  context: OfflineAudioContext,
  options: {
    frequency: number;
    at: number;
    duration: number;
    gain: number;
    type?: OscillatorType;
    detune?: number;
  },
) {
  const oscillator = context.createOscillator();
  oscillator.type = options.type ?? "sine";
  oscillator.frequency.value = options.frequency;
  if (options.detune) oscillator.detune.value = options.detune;

  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0.0001, options.at);
  envelope.gain.exponentialRampToValueAtTime(options.gain, options.at + 0.02);
  envelope.gain.setValueAtTime(options.gain, options.at + options.duration - 0.03);
  envelope.gain.exponentialRampToValueAtTime(0.0001, options.at + options.duration);

  oscillator.connect(envelope).connect(context.destination);
  oscillator.start(options.at);
  oscillator.stop(options.at + options.duration + 0.02);
}

/* ------------------------------------------------------------- the library */

export const SOUND_LIBRARY: SoundDefinition[] = [
  {
    id: "room_tone",
    name: "Room tone",
    description: "The sound of an empty interior. Put it under everything.",
    track: "AMBIENCE",
    duration: 8,
    build: (context) => {
      bed(context, { seconds: 8, gain: 0.05, lowpass: 380 });
      tone(context, { frequency: 50, at: 0, duration: 8, gain: 0.012 });
    },
  },
  {
    id: "street_night",
    name: "Street, night",
    description: "Distant traffic and air, with the odd car passing.",
    track: "AMBIENCE",
    duration: 10,
    build: (context) => {
      bed(context, { seconds: 10, gain: 0.07, lowpass: 900 });
      // Two cars passing: a bandpass sweep is enough to read as one.
      for (const at of [2.1, 6.4]) {
        const source = noiseSource(context, 3, 0.85);
        const filter = context.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.value = 1.2;
        filter.frequency.setValueAtTime(180, at);
        filter.frequency.exponentialRampToValueAtTime(900, at + 1.1);
        filter.frequency.exponentialRampToValueAtTime(220, at + 2.2);

        const envelope = context.createGain();
        envelope.gain.setValueAtTime(0.0001, at);
        envelope.gain.linearRampToValueAtTime(0.11, at + 1.1);
        envelope.gain.linearRampToValueAtTime(0.0001, at + 2.2);

        source.connect(filter).connect(envelope).connect(context.destination);
        source.start(at);
        source.stop(at + 2.3);
      }
    },
  },
  {
    id: "rain",
    name: "Rain",
    description: "Steady rain against a window.",
    track: "AMBIENCE",
    duration: 8,
    build: (context) => {
      bed(context, { seconds: 8, gain: 0.09, lowpass: 7000, highpass: 700, tilt: 0.2 });
      bed(context, { seconds: 8, gain: 0.04, lowpass: 300 });
    },
  },
  {
    id: "clock_tick",
    name: "Clock tick",
    description: "One second at a time. Useful when someone is waiting.",
    track: "AMBIENCE",
    duration: 6,
    build: (context) => {
      for (let i = 0; i < 6; i += 1) {
        hit(context, {
          at: i,
          gain: 0.06,
          decay: 0.05,
          frequency: 1400,
          noise: 0.09,
          noiseFilter: 3200,
        });
      }
    },
  },
  {
    id: "phone_buzz",
    name: "Phone buzz",
    description: "A phone vibrating on a hard surface.",
    track: "SFX",
    duration: 2.6,
    build: (context) => {
      for (const at of [0.05, 0.95, 1.85]) {
        const oscillator = context.createOscillator();
        oscillator.type = "sawtooth";
        oscillator.frequency.value = 78;

        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 420;

        // The rattle: amplitude chopped at ~55 Hz for the duration of the buzz.
        const envelope = context.createGain();
        envelope.gain.setValueAtTime(0.0001, at);
        const steps = 30;
        for (let i = 0; i < steps; i += 1) {
          const t = at + (i / steps) * 0.55;
          envelope.gain.setValueAtTime(i % 2 === 0 ? 0.16 : 0.05, t);
        }
        envelope.gain.setValueAtTime(0.0001, at + 0.57);

        oscillator.connect(filter).connect(envelope).connect(context.destination);
        oscillator.start(at);
        oscillator.stop(at + 0.6);
      }
    },
  },
  {
    id: "phone_ring",
    name: "Phone ring",
    description: "Two-tone ring, twice.",
    track: "SFX",
    duration: 3.4,
    build: (context) => {
      for (const at of [0.1, 1.8]) {
        for (const frequency of [440, 480]) {
          tone(context, { frequency, at, duration: 1.1, gain: 0.09 });
        }
      }
    },
  },
  {
    id: "door_knock",
    name: "Door knock",
    description: "Three knocks on wood.",
    track: "SFX",
    duration: 1.4,
    build: (context) => {
      for (const at of [0.05, 0.38, 0.72]) {
        hit(context, { at, gain: 0.22, decay: 0.16, frequency: 120, noise: 0.16, noiseFilter: 900 });
      }
    },
  },
  {
    id: "door_close",
    name: "Door close",
    description: "A door pulled shut, with the latch.",
    track: "SFX",
    duration: 1,
    build: (context) => {
      hit(context, { at: 0.05, gain: 0.26, decay: 0.32, frequency: 80, noise: 0.18, noiseFilter: 600 });
      hit(context, { at: 0.16, gain: 0.1, decay: 0.06, frequency: 2200, noise: 0.12, noiseFilter: 4200 });
    },
  },
  {
    id: "footsteps",
    name: "Footsteps",
    description: "Six steps on a hard floor.",
    track: "SFX",
    duration: 3.2,
    build: (context) => {
      for (let i = 0; i < 6; i += 1) {
        const at = 0.1 + i * 0.5;
        hit(context, {
          at,
          gain: 0.13,
          decay: 0.12,
          frequency: 90,
          noise: 0.11,
          noiseFilter: i % 2 === 0 ? 1500 : 1200,
        });
      }
    },
  },
  {
    id: "heartbeat",
    name: "Heartbeat",
    description: "Slow, low, and impossible to ignore.",
    track: "SFX",
    duration: 4,
    build: (context) => {
      for (let i = 0; i < 4; i += 1) {
        const at = i;
        hit(context, { at, gain: 0.3, decay: 0.28, frequency: 46 });
        hit(context, { at: at + 0.28, gain: 0.2, decay: 0.24, frequency: 42 });
      }
    },
  },
  {
    id: "tension_drone",
    name: "Tension drone",
    description: "A low bed that swells. Nothing has happened yet.",
    track: "MUSIC",
    duration: 12,
    build: (context) => {
      const swell = context.createGain();
      swell.gain.setValueAtTime(0.0001, 0);
      swell.gain.linearRampToValueAtTime(0.1, 6);
      swell.gain.linearRampToValueAtTime(0.16, 10);
      swell.gain.linearRampToValueAtTime(0.0001, 12);
      swell.connect(context.destination);

      // Three near-unisons: the beating between them is the unease.
      for (const [frequency, detune] of [
        [55, 0],
        [55, 7],
        [82.5, -5],
      ]) {
        const oscillator = context.createOscillator();
        oscillator.type = "sawtooth";
        oscillator.frequency.value = frequency;
        oscillator.detune.value = detune;

        const filter = context.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(180, 0);
        filter.frequency.linearRampToValueAtTime(700, 10);

        const level = context.createGain();
        level.gain.value = 0.32;
        oscillator.connect(filter).connect(level).connect(swell);
        oscillator.start(0);
        oscillator.stop(12);
      }
    },
  },
  {
    id: "sting",
    name: "Sting",
    description: "A hard cut needs a hard sound.",
    track: "MUSIC",
    duration: 1.8,
    build: (context) => {
      hit(context, { at: 0, gain: 0.3, decay: 0.9, frequency: 62, noise: 0.2, noiseFilter: 1800 });
      for (const frequency of [220, 233, 330]) {
        tone(context, { frequency, at: 0, duration: 1.4, gain: 0.05, type: "triangle" });
      }
    },
  },
];

export function getSound(id: string): SoundDefinition | undefined {
  return SOUND_LIBRARY.find((sound) => sound.id === id);
}

/** Renders a library sound to a WAV file, ready to upload like any other. */
export async function renderSound(definition: SoundDefinition): Promise<Blob> {
  const context = new OfflineAudioContext(
    1,
    Math.ceil(definition.duration * SAMPLE_RATE),
    SAMPLE_RATE,
  );
  definition.build(context);
  const rendered = await context.startRendering();
  return encodeWav(rendered);
}
