import { Note } from "tonal";
import { getProgressionGraph, getProgressionNode } from "./progressionGraph";
import { midiToNoteName, noteNameToPitchClass } from "./notes";
import type {
  CompassNodeView,
  KeyMode,
  ProgressionGenre,
  ProgressionGraphNode,
  ProgressionMove,
  ProgressionSuggestion,
  SuggestionDifficulty,
  SuggestionFunction,
  TargetVoicing,
} from "./types";

const SHARP_PITCH_CLASSES = [
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
];

const FLAT_PITCH_CLASSES = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];

const COMMON_FLAT_KEY_ROOTS = new Set(["F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]);

const SCALE_INTERVALS: Record<KeyMode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

const QUALITY_INTERVALS: Record<string, number[]> = {
  M: [0, 4, 7],
  m: [0, 3, 7],
  "": [0, 4, 7],
  "7": [0, 4, 7, 10],
  maj7: [0, 4, 7, 11],
  m7: [0, 3, 7, 10],
  m7b5: [0, 3, 6, 10],
  dim7: [0, 3, 6, 9],
  aug: [0, 4, 8],
  sus2: [0, 2, 7],
  sus4: [0, 5, 7],
  "7sus4": [0, 5, 7, 10],
  "13sus4": [0, 5, 7, 10, 21],
  m9: [0, 3, 7, 10, 14],
};

const MINIMUM_MIDI = 57;

function normalizeSemitone(semitone: number): number {
  return ((semitone % 12) + 12) % 12;
}

function semitoneToPitchClass(semitone: number): string {
  return SHARP_PITCH_CLASSES[normalizeSemitone(semitone)];
}

function semitoneToDisplayPitchClass(
  semitone: number,
  preferFlats: boolean,
): string {
  const pitchClasses = preferFlats ? FLAT_PITCH_CLASSES : SHARP_PITCH_CLASSES;

  return pitchClasses[normalizeSemitone(semitone)];
}

function getPitchClassSemitone(noteName: string): number {
  const chroma = Note.get(noteName).chroma;

  if (!Number.isFinite(chroma)) {
    throw new Error(`Unable to read pitch class from ${noteName}.`);
  }

  return chroma as number;
}

function getNodeRootPitchClass(
  mode: KeyMode,
  keyRoot: string,
  node: ProgressionGraphNode,
): string {
  const scaleInterval = SCALE_INTERVALS[mode][node.degree - 1];

  if (typeof scaleInterval !== "number") {
    throw new Error(`Unsupported scale degree ${node.degree}.`);
  }

  return semitoneToPitchClass(
    getPitchClassSemitone(keyRoot) + scaleInterval + (node.accidental ?? 0),
  );
}

function getNodeDisplayRootPitchClass(
  mode: KeyMode,
  keyRoot: string,
  node: ProgressionGraphNode,
): string {
  const scaleInterval = SCALE_INTERVALS[mode][node.degree - 1];

  if (typeof scaleInterval !== "number") {
    throw new Error(`Unsupported scale degree ${node.degree}.`);
  }

  const accidental = node.accidental ?? 0;
  const preferFlats =
    accidental < 0 ||
    keyRoot.includes("b") ||
    COMMON_FLAT_KEY_ROOTS.has(keyRoot);

  return semitoneToDisplayPitchClass(
    getPitchClassSemitone(keyRoot) + scaleInterval + accidental,
    preferFlats,
  );
}

function getChordName(rootPitchClass: string, displayQuality: string): string {
  if (displayQuality === "M" || displayQuality === "") {
    return rootPitchClass;
  }

  return `${rootPitchClass}${displayQuality}`;
}

function getChordPitchClasses(rootPitchClass: string, quality: string): string[] {
  const intervals = QUALITY_INTERVALS[quality];

  if (!intervals) {
    throw new Error(`Unsupported chord quality ${quality}.`);
  }

  const rootSemitone = getPitchClassSemitone(rootPitchClass);

  return intervals.map((interval) =>
    semitoneToPitchClass(rootSemitone + interval),
  );
}

function buildTargetVoicing(
  rootPitchClass: string,
  quality: string,
): TargetVoicing {
  const pitchClasses = getChordPitchClasses(rootPitchClass, quality);
  const midiNumbers: number[] = [];
  let minimumMidi = MINIMUM_MIDI;

  pitchClasses.forEach((pitchClass) => {
    let midi = minimumMidi;

    while (noteNameToPitchClass(midiToNoteName(midi)) !== pitchClass) {
      midi += 1;
    }

    midiNumbers.push(midi);
    minimumMidi = midi + 1;
  });

  return {
    noteNames: midiNumbers.map(midiToNoteName),
    midiNumbers,
    pitchClasses,
  };
}

function buildCompassNodeDetails(
  mode: KeyMode,
  keyRoot: string,
  node: ProgressionGraphNode,
): CompassNodeView {
  const displayRootPitchClass = getNodeDisplayRootPitchClass(
    mode,
    keyRoot,
    node,
  );
  const chordName = getChordName(displayRootPitchClass, node.displayQuality);

  return {
    nodeId: node.id,
    romanNumeral: node.label,
    chordName,
    displayName: `${node.label} (${chordName})`,
  };
}

function buildSuggestionFromNode(
  mode: KeyMode,
  keyRoot: string,
  node: ProgressionGraphNode,
  difficulty: SuggestionDifficulty,
  functionLabel: SuggestionFunction,
  reason: string,
  idPrefix: string,
): ProgressionSuggestion {
  const view = buildCompassNodeDetails(mode, keyRoot, node);
  const rootPitchClass = getNodeRootPitchClass(mode, keyRoot, node);

  return {
    id: `${idPrefix}:${node.id}`,
    nodeId: node.id,
    romanNumeral: view.romanNumeral,
    chordName: view.chordName,
    displayName: view.displayName,
    difficulty,
    functionLabel,
    reason,
    target: buildTargetVoicing(rootPitchClass, node.quality),
  };
}

function normalizePitchClasses(pitchClasses: string[]): string[] | null {
  const normalized: string[] = [];

  for (const pitchClass of pitchClasses) {
    const note = Note.get(pitchClass);

    if (!Number.isFinite(note.chroma)) {
      return null;
    }

    normalized.push(semitoneToPitchClass(note.chroma as number));
  }

  return normalized;
}

export function buildCompassNodeView(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  nodeId: string,
): CompassNodeView {
  return buildCompassNodeDetails(
    mode,
    keyRoot,
    getProgressionNode(genre, mode, nodeId),
  );
}

export function buildTargetVoicingForNode(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  nodeId: string,
): TargetVoicing {
  const node = getProgressionNode(genre, mode, nodeId);
  const rootPitchClass = getNodeRootPitchClass(mode, keyRoot, node);

  return buildTargetVoicing(rootPitchClass, node.quality);
}

export function buildProgressionSuggestions(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  currentNodeId: string,
): ProgressionSuggestion[] {
  const currentNode = getProgressionNode(genre, mode, currentNodeId);

  return currentNode.moves.map((move: ProgressionMove) =>
    buildSuggestionFromNode(
      mode,
      keyRoot,
      getProgressionNode(genre, mode, move.to),
      move.difficulty,
      move.functionLabel,
      move.reason,
      "next",
    ),
  );
}

export function getStarterSuggestions(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
): ProgressionSuggestion[] {
  const graph = getProgressionGraph(genre, mode);

  return graph.starterNodeIds.map((nodeId) =>
    buildSuggestionFromNode(
      mode,
      keyRoot,
      getProgressionNode(genre, mode, nodeId),
      "basic",
      "common",
      "Use this as a starting point for the selected genre and key.",
      "starter",
    ),
  );
}

export function doesPitchClassSetMatchTarget(
  playedPitchClasses: string[],
  targetPitchClasses: string[],
): boolean {
  const normalizedPlayedPitchClasses = normalizePitchClasses(playedPitchClasses);
  const normalizedTargetPitchClasses = normalizePitchClasses(targetPitchClasses);

  if (!normalizedPlayedPitchClasses || !normalizedTargetPitchClasses) {
    return false;
  }

  const playedSet = new Set(normalizedPlayedPitchClasses);
  const targetSet = new Set(normalizedTargetPitchClasses);

  if (playedSet.size !== targetSet.size) {
    return false;
  }

  return [...targetSet].every((pitchClass) => playedSet.has(pitchClass));
}

export function findMatchingSuggestion(
  suggestions: ProgressionSuggestion[],
  playedPitchClasses: string[],
): ProgressionSuggestion | null {
  return (
    suggestions.find((suggestion) =>
      doesPitchClassSetMatchTarget(
        playedPitchClasses,
        suggestion.target.pitchClasses,
      ),
    ) ?? null
  );
}
