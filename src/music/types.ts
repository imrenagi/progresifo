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

export type ProgressionDisplayMode = "next-moves" | "full-progressions";

export type WorkspaceMode = "progressions" | "chord-construction";

export type ChordFamily =
  | "triads"
  | "suspended-add"
  | "sixths"
  | "sevenths"
  | "extended"
  | "altered";

export type ChordFunctionTag =
  | "tonic"
  | "predominant"
  | "dominant"
  | "passing"
  | "color"
  | "substitution";

export type ChordType = {
  readonly id: string;
  readonly family: ChordFamily;
  readonly symbol: string;
  readonly name: string;
  readonly intervals: readonly number[];
  readonly formula: string;
  readonly description: string;
  readonly usage: string;
  readonly feeling: string;
  readonly commonFunctions: readonly ChordFunctionTag[];
  readonly examples: readonly string[];
};

export type ChordConstructionExample = {
  readonly id: string;
  readonly root: string;
  readonly chordName: string;
  readonly target: TargetVoicing;
};

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

export type CuratedProgression = {
  readonly id: string;
  readonly name: string;
  readonly nodeIds: readonly string[];
  readonly description?: string;
};

export type ResolvedProgressionStep = {
  nodeId: string;
  romanNumeral: string;
  chordName: string;
  displayName: string;
  target: TargetVoicing;
};

export type ResolvedProgression = {
  id: string;
  name: string;
  displaySequence: string;
  steps: ResolvedProgressionStep[];
  description?: string;
};
