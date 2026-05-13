import { Note } from "tonal";
import { midiToNoteName, noteNameToPitchClass } from "./notes";
import type {
  PianoRange,
  ScaleFamily,
  ScaleStaffNote,
  ScaleTarget,
  ScaleType,
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
const TARGET_MINIMUM_MIDI = 60;
const STAFF_BASE_MIDI = 60;

const ROOT_SPELLINGS: Record<string, string[]> = {
  C: ["C", "D", "E", "F", "G", "A", "B"],
  "C#": ["C#", "D#", "E#", "F#", "G#", "A#", "B#"],
  Db: ["Db", "Eb", "F", "Gb", "Ab", "Bb", "C"],
  D: ["D", "E", "F#", "G", "A", "B", "C#"],
  Eb: ["Eb", "F", "G", "Ab", "Bb", "C", "D"],
  E: ["E", "F#", "G#", "A", "B", "C#", "D#"],
  F: ["F", "G", "A", "Bb", "C", "D", "E"],
  "F#": ["F#", "G#", "A#", "B", "C#", "D#", "E#"],
  Gb: ["Gb", "Ab", "Bb", "Cb", "Db", "Eb", "F"],
  G: ["G", "A", "B", "C", "D", "E", "F#"],
  Ab: ["Ab", "Bb", "C", "Db", "Eb", "F", "G"],
  A: ["A", "B", "C#", "D", "E", "F#", "G#"],
  Bb: ["Bb", "C", "D", "Eb", "F", "G", "A"],
  B: ["B", "C#", "D#", "E", "F#", "G#", "A#"],
};

export const SCALE_FAMILY_ORDER: readonly ScaleFamily[] = Object.freeze([
  "core",
  "pentatonic-blues",
  "modes",
  "symmetric",
]);

function freezeScaleType(type: ScaleType): ScaleType {
  Object.freeze(type.intervals);
  Object.freeze(type.genres);

  return Object.freeze(type);
}

const CATALOG_SCALE_TYPES: ScaleType[] = [
  {
    id: "major",
    family: "core",
    name: "Major",
    intervals: [0, 2, 4, 5, 7, 9, 11],
    formula: "1 2 3 4 5 6 7",
    steps: "W W H W W W H",
    description: "A seven-note scale built from the familiar do-re-mi pattern.",
    usage: "Use it as the home sound for major-key melodies and harmony.",
    genres: ["pop", "classical", "jazz", "film"],
  },
  {
    id: "natural-minor",
    family: "core",
    name: "Natural minor",
    intervals: [0, 2, 3, 5, 7, 8, 10],
    formula: "1 2 b3 4 5 b6 b7",
    steps: "W H W W H W W",
    description: "A seven-note minor scale with lowered third, sixth, and seventh.",
    usage: "Use it for the basic minor-key sound in songs, riffs, and melodies.",
    genres: ["pop", "classical", "rock", "film"],
  },
  {
    id: "harmonic-minor",
    family: "core",
    name: "Harmonic minor",
    intervals: [0, 2, 3, 5, 7, 8, 11],
    formula: "1 2 b3 4 5 b6 7",
    steps: "W H W W H WH H",
    description: "A minor scale with a raised seventh that creates strong pull home.",
    usage: "Use it for minor-key dominant tension and dramatic classical color.",
    genres: ["classical", "jazz", "film"],
  },
  {
    id: "melodic-minor",
    family: "core",
    name: "Melodic minor",
    intervals: [0, 2, 3, 5, 7, 9, 11],
    formula: "1 2 b3 4 5 6 7",
    steps: "W H W W W W H",
    description: "A minor scale with natural sixth and seventh for a smoother lift.",
    usage: "Use it for jazz minor color, melodic minor lines, and modern harmony.",
    genres: ["jazz", "classical", "film"],
  },
  {
    id: "major-pentatonic",
    family: "pentatonic-blues",
    name: "Major pentatonic",
    intervals: [0, 2, 4, 7, 9],
    formula: "1 2 3 5 6",
    steps: "W W WH W WH",
    description: "A five-note major scale that leaves out the fourth and seventh.",
    usage: "Use it for clear, singable melodies that avoid strong half-step tension.",
    genres: ["pop", "blues", "rock", "funk"],
  },
  {
    id: "minor-pentatonic",
    family: "pentatonic-blues",
    name: "Minor pentatonic",
    intervals: [0, 3, 5, 7, 10],
    formula: "1 b3 4 5 b7",
    steps: "WH W W WH W",
    description: "A five-note minor scale used heavily in blues, rock, and funk.",
    usage: "Use it for riffs, solos, and strong minor lines with few wrong notes.",
    genres: ["blues", "rock", "funk", "jazz"],
  },
  {
    id: "blues",
    family: "pentatonic-blues",
    name: "Blues",
    intervals: [0, 3, 5, 6, 7, 10],
    formula: "1 b3 4 b5 5 b7",
    steps: "WH W H H WH W",
    description: "A minor pentatonic scale with an added flat fifth blue note.",
    usage: "Use it for blues lines, rock solos, funk riffs, and gritty color.",
    genres: ["blues", "rock", "funk", "jazz"],
  },
  {
    id: "dorian",
    family: "modes",
    name: "Dorian",
    intervals: [0, 2, 3, 5, 7, 9, 10],
    formula: "1 2 b3 4 5 6 b7",
    steps: "W H W W W H W",
    description: "A minor mode with a natural sixth that sounds open and soulful.",
    usage: "Use it over minor grooves, modal jazz, funk, and folk colors.",
    genres: ["jazz", "funk", "rock", "film"],
  },
  {
    id: "phrygian",
    family: "modes",
    name: "Phrygian",
    intervals: [0, 1, 3, 5, 7, 8, 10],
    formula: "1 b2 b3 4 5 b6 b7",
    steps: "H W W W H W W",
    description: "A minor mode with a flat second that creates a dark bite.",
    usage: "Use it for Spanish, metal, cinematic, or tense modal colors.",
    genres: ["classical", "rock", "film", "jazz"],
  },
  {
    id: "lydian",
    family: "modes",
    name: "Lydian",
    intervals: [0, 2, 4, 6, 7, 9, 11],
    formula: "1 2 3 #4 5 6 7",
    steps: "W W W H W W H",
    description: "A major mode with a raised fourth that feels bright and floating.",
    usage: "Use it for film, fusion, and dreamy major-key color.",
    genres: ["jazz", "film", "pop"],
  },
  {
    id: "mixolydian",
    family: "modes",
    name: "Mixolydian",
    intervals: [0, 2, 4, 5, 7, 9, 10],
    formula: "1 2 3 4 5 6 b7",
    steps: "W W H W W H W",
    description: "A major mode with a flat seventh that sounds bluesy and grounded.",
    usage: "Use it over dominant sounds, rock riffs, funk grooves, and folk tunes.",
    genres: ["blues", "rock", "funk", "jazz"],
  },
  {
    id: "locrian",
    family: "modes",
    name: "Locrian",
    intervals: [0, 1, 3, 5, 6, 8, 10],
    formula: "1 b2 b3 4 b5 b6 b7",
    steps: "H W W H W W W",
    description: "A diminished minor mode with a flat second and flat fifth.",
    usage: "Use it for half-diminished color and unstable, unresolved lines.",
    genres: ["jazz", "film"],
  },
  {
    id: "whole-tone",
    family: "symmetric",
    name: "Whole tone",
    intervals: [0, 2, 4, 6, 8, 10],
    formula: "1 2 3 #4 #5 b7",
    steps: "W W W W W W",
    description: "A six-note symmetric scale made only of whole steps.",
    usage: "Use it for dreamy augmented sounds and floating dominant color.",
    genres: ["jazz", "film", "classical"],
  },
  {
    id: "diminished-whole-half",
    family: "symmetric",
    name: "Diminished whole-half",
    intervals: [0, 2, 3, 5, 6, 8, 9, 11],
    formula: "1 2 b3 4 b5 b6 6 7",
    steps: "W H W H W H W H",
    description: "An eight-note symmetric diminished scale starting with a whole step.",
    usage: "Use it around diminished seventh sounds and tense passing motion.",
    genres: ["jazz", "classical", "film"],
  },
  {
    id: "diminished-half-whole",
    family: "symmetric",
    name: "Diminished half-whole",
    intervals: [0, 1, 3, 4, 6, 7, 9, 10],
    formula: "1 b2 #2 3 #4 5 6 b7",
    steps: "H W H W H W H W",
    description: "An eight-note symmetric diminished scale starting with a half step.",
    usage: "Use it over dominant chords with b9, #9, #11, or 13 tension.",
    genres: ["jazz", "blues", "film"],
  },
];

export const SCALE_TYPES: readonly ScaleType[] = Object.freeze(
  CATALOG_SCALE_TYPES.map(freezeScaleType),
);

function normalizeSemitone(semitone: number): number {
  return ((semitone % 12) + 12) % 12;
}

function semitoneToPitchClass(semitone: number): string {
  return SHARP_PITCH_CLASSES[normalizeSemitone(semitone)];
}

function normalizeAccidentalDistance(distance: number): number {
  if (distance > 6) {
    return distance - 12;
  }

  if (distance < -6) {
    return distance + 12;
  }

  return distance;
}

function getPitchClassSemitone(noteName: string): number {
  const chroma = Note.get(noteName).chroma;

  if (!Number.isFinite(chroma)) {
    throw new Error(`Unable to read pitch class from ${noteName}.`);
  }

  return chroma as number;
}

function normalizePitchClasses(pitchClasses: string[]): string[] | null {
  const normalized: string[] = [];

  for (const pitchClass of pitchClasses) {
    const chroma = Note.get(pitchClass).chroma;

    if (!Number.isFinite(chroma)) {
      return null;
    }

    normalized.push(semitoneToPitchClass(chroma as number));
  }

  return normalized;
}

function spellPitchClassFromScaleDegree(
  root: string,
  type: ScaleType,
  interval: number,
  index: number,
): string {
  const majorSpelling = ROOT_SPELLINGS[root];
  const formulaDegree = type.formula.split(/\s+/)[index];
  const degreeMatch = /^([b#]*)([1-7])$/.exec(formulaDegree);

  if (!majorSpelling || !degreeMatch) {
    return semitoneToPitchClass(getPitchClassSemitone(root) + interval);
  }

  const baseNote = majorSpelling[Number.parseInt(degreeMatch[2], 10) - 1];
  const baseLetterMatch = /^([A-G])/.exec(baseNote);

  if (!baseLetterMatch) {
    return semitoneToPitchClass(getPitchClassSemitone(root) + interval);
  }

  const expectedSemitone = normalizeSemitone(getPitchClassSemitone(root) + interval);
  const baseLetter = baseLetterMatch[1];
  const baseLetterSemitone = getPitchClassSemitone(baseLetter);
  const accidentalDistance = normalizeAccidentalDistance(
    expectedSemitone - baseLetterSemitone,
  );
  const accidental =
    accidentalDistance > 0
      ? "#".repeat(accidentalDistance)
      : "b".repeat(Math.abs(accidentalDistance));

  return `${baseLetter}${accidental}`;
}

function getDisplayNotes(root: string, type: ScaleType): string[] {
  const majorSpelling = ROOT_SPELLINGS[root];

  if (!majorSpelling) {
    throw new Error(`Unsupported scale root ${root}.`);
  }

  return type.intervals.map((interval, index) =>
    spellPitchClassFromScaleDegree(root, type, interval, index),
  );
}

function resolveMidiNumbersWithinRange(
  pitchClasses: string[],
  range: PianoRange,
): number[] {
  return pitchClasses.map((pitchClass) => {
    for (let midi = range.start; midi <= range.end; midi += 1) {
      if (noteNameToPitchClass(midiToNoteName(midi)) === pitchClass) {
        return midi;
      }
    }

    throw new Error(
      `Unable to resolve scale pitch class ${pitchClass} within MIDI range ${range.start}-${range.end}.`,
    );
  });
}

function resolveMidiNumbersFromMinimum(
  pitchClasses: string[],
  minimumMidi: number,
): number[] {
  const midiNumbers: number[] = [];
  let nextMinimumMidi = minimumMidi;

  pitchClasses.forEach((pitchClass) => {
    for (let midi = nextMinimumMidi; midi < nextMinimumMidi + 24; midi += 1) {
      if (noteNameToPitchClass(midiToNoteName(midi)) === pitchClass) {
        midiNumbers.push(midi);
        nextMinimumMidi = midi + 1;
        return;
      }
    }

    throw new Error(
      `Unable to resolve scale pitch class ${pitchClass} from MIDI ${nextMinimumMidi}.`,
    );
  });

  return midiNumbers;
}

function isWithinRange(midiNumbers: number[], range: PianoRange): boolean {
  return midiNumbers.every((midi) => midi >= range.start && midi <= range.end);
}

function shouldUseCompactRange(range: PianoRange): boolean {
  return range.end - range.start + 1 <= 24;
}

export function getScaleTypeById(id: string): ScaleType {
  const type = SCALE_TYPES.find((candidate) => candidate.id === id);

  if (!type) {
    throw new Error(`Unknown scale type ${id}.`);
  }

  return type;
}

export function getScaleTypesByFamily(
  family: ScaleFamily,
): readonly ScaleType[] {
  return SCALE_TYPES.filter((type) => type.family === family);
}

export function buildScaleTarget(
  root: string,
  type: ScaleType,
  range?: PianoRange,
): ScaleTarget {
  const rootSemitone = getPitchClassSemitone(root);
  const noteNames = getDisplayNotes(root, type);
  const pitchClasses = type.intervals.map((interval) =>
    semitoneToPitchClass(rootSemitone + interval),
  );
  const defaultMidiNumbers = resolveMidiNumbersFromMinimum(
    pitchClasses,
    TARGET_MINIMUM_MIDI,
  );
  const midiNumbers =
    range && (shouldUseCompactRange(range) || !isWithinRange(defaultMidiNumbers, range))
      ? resolveMidiNumbersWithinRange(pitchClasses, range)
      : defaultMidiNumbers;

  return { noteNames, pitchClasses, midiNumbers };
}

export function buildScaleStaffNotes(target: ScaleTarget): ScaleStaffNote[] {
  return target.pitchClasses.map((pitchClass, index) => {
    const midi = resolveMidiNumbersFromMinimum([pitchClass], STAFF_BASE_MIDI)[0];
    const octave = Note.get(midiToNoteName(midi)).oct ?? 4;
    const noteName = `${target.noteNames[index]}${octave}`;

    return {
      noteName,
      pitchClass,
      octave,
      staffStep: index,
    };
  });
}

export function doesPitchClassSetMatchScaleTarget(
  pitchClasses: string[],
  targetPitchClasses: string[],
): boolean {
  const normalizedPlayed = normalizePitchClasses(pitchClasses);
  const normalizedTarget = normalizePitchClasses(targetPitchClasses);

  if (!normalizedPlayed || !normalizedTarget) {
    return false;
  }

  const playedSet = new Set(normalizedPlayed);
  const targetSet = new Set(normalizedTarget);

  if (playedSet.size !== targetSet.size) {
    return false;
  }

  return [...targetSet].every((pitchClass) => playedSet.has(pitchClass));
}
