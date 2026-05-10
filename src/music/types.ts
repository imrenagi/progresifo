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

export type ProgressionGenre =
  | "pop"
  | "jazz"
  | "blues"
  | "classical"
  | "gospel"
  | "neo-soul";

export type KeyMode = "major" | "minor";

export type SuggestionDifficulty = "basic" | "colorful" | "advanced";

export type SuggestionFunction =
  | "common"
  | "smooth"
  | "tension"
  | "spicy"
  | "resolve";

export type ProgressionMove = {
  to: string;
  difficulty: SuggestionDifficulty;
  functionLabel: SuggestionFunction;
  reason: string;
};

export type ProgressionGraphNode = {
  id: string;
  label: string;
  degree: number;
  accidental?: number;
  quality: string;
  displayQuality: string;
  moves: ProgressionMove[];
};

export type ProgressionGraph = {
  genre: ProgressionGenre;
  mode: KeyMode;
  starterNodeIds: string[];
  nodes: ProgressionGraphNode[];
};

export type TargetVoicing = {
  noteNames: string[];
  midiNumbers: number[];
  pitchClasses: string[];
};

export type ProgressionSuggestion = {
  id: string;
  nodeId: string;
  romanNumeral: string;
  chordName: string;
  displayName: string;
  difficulty: SuggestionDifficulty;
  functionLabel: SuggestionFunction;
  reason: string;
  target: TargetVoicing;
};

export type CompassNodeView = {
  nodeId: string;
  romanNumeral: string;
  chordName: string;
  displayName: string;
};
