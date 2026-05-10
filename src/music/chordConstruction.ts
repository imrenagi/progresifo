import { Note } from "tonal";
import { midiToNoteName, noteNameToPitchClass } from "./notes";
import type {
  ChordConstructionExample,
  ChordFamily,
  ChordType,
  KeyMode,
  PianoRange,
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

const SCALE_INTERVALS: Record<KeyMode, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};

const TARGET_MINIMUM_MIDI = 60;

type ChordTargetOptions = {
  range?: PianoRange;
};

export const CHORD_FAMILY_ORDER: readonly ChordFamily[] = Object.freeze([
  "triads",
  "suspended-add",
  "sixths",
  "sevenths",
  "extended",
  "altered",
]);

function freezeChordType(type: ChordType): ChordType {
  Object.freeze(type.intervals);
  Object.freeze(type.commonFunctions);
  Object.freeze(type.examples);

  return Object.freeze(type);
}

const CATALOG_CHORD_TYPES: ChordType[] = [
  {
    id: "major",
    family: "triads",
    symbol: "",
    name: "Major",
    intervals: [0, 4, 7],
    formula: "1 3 5",
    description:
      "Start on the root, add a major third, then add a perfect fifth.",
    usage:
      "Use it for stable tonic chords, clear cadences, and bright harmonic centers.",
    feeling: "Bright, stable, open, resolved.",
    commonFunctions: ["tonic"],
    examples: ["C -> F -> G", "G -> C"],
  },
  {
    id: "minor",
    family: "triads",
    symbol: "m",
    name: "Minor",
    intervals: [0, 3, 7],
    formula: "1 b3 5",
    description:
      "Start with a major triad shape and lower the third by one semitone.",
    usage:
      "Use it for minor-key tonic chords, softer color, or contrast inside major keys.",
    feeling: "Darker, softer, reflective, grounded.",
    commonFunctions: ["tonic", "predominant"],
    examples: ["Am -> F -> C -> G", "Dm -> G -> C"],
  },
  {
    id: "diminished",
    family: "triads",
    symbol: "dim",
    name: "Diminished",
    intervals: [0, 3, 6],
    formula: "1 b3 b5",
    description: "Build a minor triad and lower the fifth by one semitone.",
    usage:
      "Use it as a tense passing chord or leading-tone chord that wants to resolve.",
    feeling: "Tense, narrow, unstable, suspenseful.",
    commonFunctions: ["passing", "dominant"],
    examples: ["Bdim -> C", "F#dim -> G"],
  },
  {
    id: "augmented",
    family: "triads",
    symbol: "aug",
    name: "Augmented",
    intervals: [0, 4, 8],
    formula: "1 3 #5",
    description: "Build a major triad and raise the fifth by one semitone.",
    usage:
      "Use it to create lift, surprise, or a chromatic push into the next chord.",
    feeling: "Floating, bright, unsettled, cinematic.",
    commonFunctions: ["passing", "color"],
    examples: ["Caug -> F", "Gaug -> C"],
  },
  {
    id: "sus-2",
    family: "suspended-add",
    symbol: "sus2",
    name: "Suspended second",
    intervals: [0, 2, 7],
    formula: "1 2 5",
    description: "Replace the third with the second scale degree above the root.",
    usage: "Use it when you want openness without deciding major or minor yet.",
    feeling: "Open, airy, neutral, unresolved.",
    commonFunctions: ["color"],
    examples: ["Csus2 -> C", "Gsus2 -> G"],
  },
  {
    id: "sus-4",
    family: "suspended-add",
    symbol: "sus4",
    name: "Suspended fourth",
    intervals: [0, 5, 7],
    formula: "1 4 5",
    description: "Replace the third with the fourth scale degree above the root.",
    usage:
      "Use it to delay resolution before returning to a major or minor chord.",
    feeling: "Lifted, waiting, unresolved, strong.",
    commonFunctions: ["color", "dominant"],
    examples: ["Csus4 -> C", "Gsus4 -> G"],
  },
  {
    id: "add-9",
    family: "suspended-add",
    symbol: "add9",
    name: "Add nine",
    intervals: [0, 4, 7, 14],
    formula: "1 3 5 9",
    description:
      "Start with a major triad and add the ninth without adding a seventh.",
    usage:
      "Use it to make a plain major chord sound wider without making it jazzy.",
    feeling: "Bright, spacious, modern, gentle.",
    commonFunctions: ["tonic", "color"],
    examples: ["Cadd9 -> G", "Fadd9 -> C"],
  },
  {
    id: "six",
    family: "sixths",
    symbol: "6",
    name: "Sixth",
    intervals: [0, 4, 7, 9],
    formula: "1 3 5 6",
    description: "Start with a major triad and add the sixth scale degree.",
    usage:
      "Use it as a warm tonic color in pop, jazz, soul, and older standards.",
    feeling: "Warm, settled, sweet, nostalgic.",
    commonFunctions: ["tonic", "color"],
    examples: ["C6 -> F", "F6 -> G7 -> C"],
  },
  {
    id: "minor-six",
    family: "sixths",
    symbol: "m6",
    name: "Minor sixth",
    intervals: [0, 3, 7, 9],
    formula: "1 b3 5 6",
    description: "Start with a minor triad and add the natural sixth above the root.",
    usage:
      "Use it for a minor tonic that feels more sophisticated and less dark.",
    feeling: "Minor, warm, elegant, slightly jazzy.",
    commonFunctions: ["tonic", "color"],
    examples: ["Am6 -> Dm", "Cm6 -> G7"],
  },
  {
    id: "dominant-7",
    family: "sevenths",
    symbol: "7",
    name: "Dominant seventh",
    intervals: [0, 4, 7, 10],
    formula: "1 3 5 b7",
    description: "Start with a major triad and add a flat seventh above the root.",
    usage:
      "Use it to create pull toward another chord, especially V7 resolving to I.",
    feeling: "Tense, bluesy, directional, wants to resolve.",
    commonFunctions: ["dominant"],
    examples: ["G7 -> C", "E7 -> Am"],
  },
  {
    id: "major-7",
    family: "sevenths",
    symbol: "maj7",
    name: "Major seventh",
    intervals: [0, 4, 7, 11],
    formula: "1 3 5 7",
    description: "Start with a major triad and add the natural seventh above the root.",
    usage: "Use it for smooth tonic color in jazz, neo-soul, film, and ballads.",
    feeling: "Dreamy, smooth, polished, resolved.",
    commonFunctions: ["tonic", "color"],
    examples: ["Cmaj7 -> Fmaj7", "Fmaj7 -> G7 -> Cmaj7"],
  },
  {
    id: "minor-7",
    family: "sevenths",
    symbol: "m7",
    name: "Minor seventh",
    intervals: [0, 3, 7, 10],
    formula: "1 b3 5 b7",
    description: "Start with a minor triad and add a flat seventh above the root.",
    usage:
      "Use it for ii chords, vi chords, minor grooves, and relaxed pre-dominant motion.",
    feeling: "Smooth, soulful, relaxed, minor.",
    commonFunctions: ["predominant", "tonic"],
    examples: ["Dm7 -> G7 -> Cmaj7", "Am7 -> D7"],
  },
  {
    id: "minor-7-flat-5",
    family: "sevenths",
    symbol: "m7b5",
    name: "Half-diminished seventh",
    intervals: [0, 3, 6, 10],
    formula: "1 b3 b5 b7",
    description: "Start with a diminished triad and add a flat seventh.",
    usage:
      "Use it as ii in minor-key ii-V-i progressions or as a darker passing color.",
    feeling: "Dark, tense, sophisticated, unresolved.",
    commonFunctions: ["predominant", "passing"],
    examples: ["Bm7b5 -> E7 -> Am", "Dm7b5 -> G7 -> Cm"],
  },
  {
    id: "diminished-7",
    family: "sevenths",
    symbol: "dim7",
    name: "Diminished seventh",
    intervals: [0, 3, 6, 9],
    formula: "1 b3 b5 bb7",
    description:
      "Stack three minor thirds from the root for a fully diminished seventh chord.",
    usage:
      "Use it for strong leading-tone pull, dramatic passing motion, or modulation.",
    feeling: "Dramatic, tight, unstable, urgent.",
    commonFunctions: ["passing", "dominant"],
    examples: ["Bdim7 -> C", "C#dim7 -> Dm"],
  },
  {
    id: "dominant-9",
    family: "extended",
    symbol: "9",
    name: "Dominant ninth",
    intervals: [0, 4, 7, 10, 14],
    formula: "1 3 5 b7 9",
    description: "Start with a dominant seventh and add the ninth above the root.",
    usage: "Use it for richer blues, funk, jazz, and gospel dominant motion.",
    feeling: "Groovy, rich, bluesy, colorful.",
    commonFunctions: ["dominant", "color"],
    examples: ["G9 -> C", "A9 -> D7"],
  },
  {
    id: "major-9",
    family: "extended",
    symbol: "maj9",
    name: "Major ninth",
    intervals: [0, 4, 7, 11, 14],
    formula: "1 3 5 7 9",
    description: "Start with a major seventh and add the ninth above the root.",
    usage:
      "Use it for lush tonic color in jazz, neo-soul, R&B, and cinematic harmony.",
    feeling: "Lush, dreamy, expensive, calm.",
    commonFunctions: ["tonic", "color"],
    examples: ["Cmaj9 -> Fmaj9", "Ebmaj9 -> Abmaj9"],
  },
  {
    id: "minor-9",
    family: "extended",
    symbol: "m9",
    name: "Minor ninth",
    intervals: [0, 3, 7, 10, 14],
    formula: "1 b3 5 b7 9",
    description: "Start with a minor seventh and add the ninth above the root.",
    usage:
      "Use it for smooth minor color, especially in jazz, R&B, lo-fi, and neo-soul.",
    feeling: "Soft, moody, deep, spacious.",
    commonFunctions: ["tonic", "predominant", "color"],
    examples: ["Dm9 -> G13", "Am9 -> D9"],
  },
  {
    id: "dominant-11",
    family: "extended",
    symbol: "11",
    name: "Dominant eleventh",
    intervals: [0, 4, 7, 10, 14, 17],
    formula: "1 3 5 b7 9 11",
    description: "Start with a dominant ninth and add the eleventh above the root.",
    usage:
      "Use it for a wide dominant sound, often with some tones omitted in real voicings.",
    feeling: "Broad, suspended, tense, colorful.",
    commonFunctions: ["dominant", "color"],
    examples: ["G11 -> C", "D11 -> G"],
  },
  {
    id: "dominant-13",
    family: "extended",
    symbol: "13",
    name: "Dominant thirteenth",
    intervals: [0, 4, 7, 10, 14, 21],
    formula: "1 3 5 b7 9 13",
    description: "Start with a dominant ninth and add the thirteenth above the root.",
    usage: "Use it for a big dominant sound in jazz, funk, gospel, and neo-soul.",
    feeling: "Bright, rich, sophisticated, driving.",
    commonFunctions: ["dominant", "color"],
    examples: ["G13 -> Cmaj9", "E13 -> Am9"],
  },
  {
    id: "dominant-7-flat-9",
    family: "altered",
    symbol: "7b9",
    name: "Dominant seven flat nine",
    intervals: [0, 4, 7, 10, 13],
    formula: "1 3 5 b7 b9",
    description:
      "Start with a dominant seventh and add a ninth lowered by one semitone.",
    usage:
      "Use it for strong minor-key dominant pull or a darker turnaround color.",
    feeling: "Spicy, tense, dark, urgent.",
    commonFunctions: ["dominant", "color"],
    examples: ["E7b9 -> Am", "G7b9 -> C"],
  },
  {
    id: "dominant-7-sharp-9",
    family: "altered",
    symbol: "7#9",
    name: "Dominant seven sharp nine",
    intervals: [0, 4, 7, 10, 15],
    formula: "1 3 5 b7 #9",
    description:
      "Start with a dominant seventh and add a ninth raised by one semitone.",
    usage:
      "Use it for blues, funk, rock, and altered dominant tension before resolution.",
    feeling: "Gritty, bluesy, aggressive, spicy.",
    commonFunctions: ["dominant", "color"],
    examples: ["E7#9 -> A", "G7#9 -> C"],
  },
  {
    id: "dominant-7-flat-5",
    family: "altered",
    symbol: "7b5",
    name: "Dominant seven flat five",
    intervals: [0, 4, 6, 10],
    formula: "1 3 b5 b7",
    description: "Start with a dominant seventh and lower the fifth by one semitone.",
    usage: "Use it as an altered dominant or tritone-substitution color.",
    feeling: "Angular, tense, jazzy, unstable.",
    commonFunctions: ["dominant", "substitution"],
    examples: ["Db7b5 -> C", "G7b5 -> C"],
  },
  {
    id: "dominant-7-sharp-5",
    family: "altered",
    symbol: "7#5",
    name: "Dominant seven sharp five",
    intervals: [0, 4, 8, 10],
    formula: "1 3 #5 b7",
    description: "Start with a dominant seventh and raise the fifth by one semitone.",
    usage:
      "Use it for a dominant chord that pushes upward with extra chromatic color.",
    feeling: "Bright, tense, floating, dramatic.",
    commonFunctions: ["dominant", "color"],
    examples: ["G7#5 -> C", "E7#5 -> Am"],
  },
];

export const CHORD_TYPES: readonly ChordType[] = Object.freeze(
  CATALOG_CHORD_TYPES.map(freezeChordType),
);

function normalizeSemitone(semitone: number): number {
  return ((semitone % 12) + 12) % 12;
}

function semitoneToPitchClass(semitone: number): string {
  return SHARP_PITCH_CLASSES[normalizeSemitone(semitone)];
}

function validateInterval(interval: number, type: ChordType): void {
  if (!Number.isFinite(interval)) {
    throw new Error(
      `Chord type ${type.id} contains a non-finite interval: ${String(interval)}.`,
    );
  }
}

function getPitchClassSemitone(noteName: string): number {
  const chroma = Note.get(noteName).chroma;

  if (!Number.isFinite(chroma)) {
    throw new Error(`Unable to read pitch class from ${noteName}.`);
  }

  return chroma as number;
}

function getChordName(root: string, type: ChordType): string {
  return `${root}${type.symbol}`;
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

function getChordTargetRange(
  optionsOrRange?: PianoRange | ChordTargetOptions,
): PianoRange | undefined {
  if (!optionsOrRange) {
    return undefined;
  }

  if ("start" in optionsOrRange && "end" in optionsOrRange) {
    return optionsOrRange;
  }

  return optionsOrRange.range;
}

export function getChordTypeById(id: string): ChordType {
  const type = CHORD_TYPES.find((candidate) => candidate.id === id);

  if (!type) {
    throw new Error(`Unknown chord type ${id}.`);
  }

  return type;
}

export function getChordTypesByFamily(
  family: ChordFamily,
): readonly ChordType[] {
  return CHORD_TYPES.filter((type) => type.family === family);
}

export function buildScalePitchClasses(root: string, mode: KeyMode): string[] {
  const rootSemitone = getPitchClassSemitone(root);
  return SCALE_INTERVALS[mode].map((interval) =>
    semitoneToPitchClass(rootSemitone + interval),
  );
}

function resolveMidiNumbersFromMinimum(
  pitchClasses: string[],
  minimumMidi: number,
  maximumMidi?: number,
): number[] {
  const midiNumbers: number[] = [];
  let nextMinimumMidi = minimumMidi;

  pitchClasses.forEach((pitchClass) => {
    const searchEnd = Math.min(
      nextMinimumMidi + SHARP_PITCH_CLASSES.length - 1,
      maximumMidi ?? Number.POSITIVE_INFINITY,
    );
    let matchingMidi: number | null = null;

    for (let midi = nextMinimumMidi; midi <= searchEnd; midi += 1) {
      if (noteNameToPitchClass(midiToNoteName(midi)) === pitchClass) {
        matchingMidi = midi;
        break;
      }
    }

    if (matchingMidi === null) {
      const searchLimitDescription =
        maximumMidi === undefined
          ? "within one octave"
          : `through MIDI ${maximumMidi}`;

      throw new Error(
        `Unable to resolve target pitch class ${pitchClass} from MIDI ${nextMinimumMidi} ${searchLimitDescription}.`,
      );
    }

    midiNumbers.push(matchingMidi);
    nextMinimumMidi = matchingMidi + 1;
  });

  return midiNumbers;
}

function buildTargetVoicing(
  pitchClasses: string[],
  midiNumbers: number[],
): TargetVoicing {
  return {
    noteNames: midiNumbers.map(midiToNoteName),
    midiNumbers,
    pitchClasses,
  };
}

function resolveMidiNumbersWithinRange(
  pitchClasses: string[],
  range: PianoRange,
): TargetVoicing {
  const representatives = pitchClasses.map((pitchClass) => {
    for (let midi = range.start; midi <= range.end; midi += 1) {
      if (noteNameToPitchClass(midiToNoteName(midi)) === pitchClass) {
        return { midi, pitchClass };
      }
    }

    throw new Error(
      `Unable to resolve target pitch class ${pitchClass} within MIDI range ${range.start}-${range.end}.`,
    );
  });
  const sortedRepresentatives = [...representatives]
    .sort((left, right) => left.midi - right.midi)
    .filter(
      (representative, index, sorted) =>
        index === 0 || representative.midi !== sorted[index - 1]?.midi,
    );

  return buildTargetVoicing(
    sortedRepresentatives.map((representative) => representative.pitchClass),
    sortedRepresentatives.map((representative) => representative.midi),
  );
}

function isWithinRange(midiNumbers: number[], range: PianoRange): boolean {
  return midiNumbers.every((midi) => midi >= range.start && midi <= range.end);
}

export function buildChordTarget(
  root: string,
  type: ChordType,
  optionsOrRange?: PianoRange | ChordTargetOptions,
): TargetVoicing {
  const rootSemitone = getPitchClassSemitone(root);
  const pitchClasses = type.intervals.map((interval) => {
    validateInterval(interval, type);
    return semitoneToPitchClass(rootSemitone + interval);
  });
  const range = getChordTargetRange(optionsOrRange);
  const defaultMidiNumbers = resolveMidiNumbersFromMinimum(
    pitchClasses,
    TARGET_MINIMUM_MIDI,
  );

  if (!range) {
    return buildTargetVoicing(pitchClasses, defaultMidiNumbers);
  }

  if (isWithinRange(defaultMidiNumbers, range)) {
    return buildTargetVoicing(pitchClasses, defaultMidiNumbers);
  }

  try {
    return resolveMidiNumbersWithinRange(pitchClasses, range);
  } catch (error) {
    throw new Error(
      `Unable to voice ${getChordName(root, type)} within MIDI range ${range.start}-${range.end}.`,
      { cause: error },
    );
  }
}

function buildExample(
  root: string,
  type: ChordType,
  range?: PianoRange,
): ChordConstructionExample {
  return {
    id: `${type.id}:${root}`,
    root,
    chordName: getChordName(root, type),
    target: buildChordTarget(root, type, range),
  };
}

export function buildChordConstructionExamples(
  type: ChordType,
  scaleRoot: string,
  mode: KeyMode,
  optionsOrRange?: PianoRange | ChordTargetOptions,
): {
  inScale: ChordConstructionExample[];
  onScaleRoots: ChordConstructionExample[];
} {
  const range = getChordTargetRange(optionsOrRange);
  const scalePitchClasses = buildScalePitchClasses(scaleRoot, mode);
  const scaleSet = new Set(scalePitchClasses);
  const onScaleRoots = scalePitchClasses.map((root) =>
    buildExample(root, type, range),
  );
  const inScale = onScaleRoots.filter((example) =>
    example.target.pitchClasses.every((pitchClass) => scaleSet.has(pitchClass)),
  );

  return { inScale, onScaleRoots };
}

export function doesPitchClassSetMatchChordTarget(
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
