export type ActiveNoteSource = "pointer" | "midi";

export type PianoInteractionMode = "hold" | "latch";

export type ActiveNote = {
  id: string;
  midi: number;
  name: string;
  pitchClass: string;
  source: ActiveNoteSource;
  ownerId?: string;
  velocity?: number;
  startedAt: number;
};

export type PianoRange = {
  start: number;
  end: number;
};

export type PianoKey = {
  midi: number;
  name: string;
  pitchClass: string;
  isBlack: boolean;
};

export type ChordDetection = {
  primary: string | null;
  alternatives: string[];
  candidates: string[];
  pitchClasses: string[];
};
