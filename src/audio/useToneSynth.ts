import { useCallback, useEffect, useRef, useState } from "react";

export type AudioStatus = "off" | "starting" | "on" | "error";

type ToneSynthOptions = {
  oscillator: { type: "triangle" };
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
};

type TonePolySynth = {
  toDestination: () => TonePolySynth;
  triggerAttack: (
    note: string,
    time?: unknown,
    velocity?: number,
  ) => TonePolySynth;
  triggerRelease: (note: string) => TonePolySynth;
  releaseAll: () => TonePolySynth;
  dispose: () => TonePolySynth;
};

type ToneModule = {
  start: () => Promise<void>;
  Synth: new (...args: never[]) => unknown;
  PolySynth: new (
    voice: ToneModule["Synth"],
    options: ToneSynthOptions,
  ) => TonePolySynth;
};

export type UseToneSynthResult = {
  status: AudioStatus;
  enable: () => Promise<void>;
  disable: () => void;
  triggerAttack: (midi: number, velocity?: number) => void;
  triggerRelease: (midi: number) => void;
};

const noteNames = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
] as const;

const synthOptions: ToneSynthOptions = {
  oscillator: { type: "triangle" },
  envelope: {
    attack: 0.01,
    decay: 0.18,
    sustain: 0.45,
    release: 0.8,
  },
};

function midiToNoteName(midi: number): string {
  const roundedMidi = Math.round(midi);
  const noteName = noteNames[((roundedMidi % 12) + 12) % 12];
  const octave = Math.floor(roundedMidi / 12) - 1;

  return `${noteName}${octave}`;
}

export function useToneSynth(): UseToneSynthResult {
  const isMountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const startupPromiseRef = useRef<Promise<void> | null>(null);
  const statusRef = useRef<AudioStatus>("off");
  const synthRef = useRef<TonePolySynth | null>(null);
  const soundingNotesRef = useRef<Set<string>>(new Set());
  const [status, setStatusState] = useState<AudioStatus>("off");

  const setStatus = useCallback((nextStatus: AudioStatus) => {
    statusRef.current = nextStatus;

    if (isMountedRef.current) {
      setStatusState(nextStatus);
    }
  }, []);

  const cleanupSynth = useCallback(() => {
    synthRef.current?.releaseAll();
    synthRef.current?.dispose();
    synthRef.current = null;
    soundingNotesRef.current.clear();
  }, []);

  const enable = useCallback(() => {
    if (statusRef.current === "on") {
      return Promise.resolve();
    }

    if (statusRef.current === "starting" && startupPromiseRef.current) {
      return startupPromiseRef.current;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setStatus("starting");

    let startupPromise!: Promise<void>;
    startupPromise = (async () => {
      try {
        const tone = (await import("tone")) as ToneModule;
        await tone.start();

        if (!isMountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        cleanupSynth();
        const synth = new tone.PolySynth(
          tone.Synth,
          synthOptions,
        ).toDestination();
        synthRef.current = synth;
        setStatus("on");
      } catch {
        if (!isMountedRef.current || requestId !== requestIdRef.current) {
          return;
        }

        cleanupSynth();
        setStatus("error");
      } finally {
        if (startupPromiseRef.current === startupPromise) {
          startupPromiseRef.current = null;
        }
      }
    })();

    startupPromiseRef.current = startupPromise;
    return startupPromise;
  }, [cleanupSynth, setStatus]);

  const disable = useCallback(() => {
    requestIdRef.current += 1;
    startupPromiseRef.current = null;
    cleanupSynth();
    setStatus("off");
  }, [cleanupSynth, setStatus]);

  const triggerAttack = useCallback((midi: number, velocity = 100) => {
    const noteName = midiToNoteName(midi);

    if (
      statusRef.current !== "on" ||
      soundingNotesRef.current.has(noteName) ||
      !synthRef.current
    ) {
      return;
    }

    soundingNotesRef.current.add(noteName);
    synthRef.current.triggerAttack(noteName, undefined, velocity / 127);
  }, []);

  const triggerRelease = useCallback((midi: number) => {
    if (statusRef.current !== "on" || !synthRef.current) {
      return;
    }

    const noteName = midiToNoteName(midi);

    soundingNotesRef.current.delete(noteName);
    synthRef.current.triggerRelease(noteName);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
      startupPromiseRef.current = null;
      cleanupSynth();
      statusRef.current = "off";
    };
  }, [cleanupSynth]);

  return {
    status,
    enable,
    disable,
    triggerAttack,
    triggerRelease,
  };
}
