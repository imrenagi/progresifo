# Chord Construction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a dedicated chord construction workspace where users can browse curated chord variations, learn how and when to use them, and validate the selected target chord on the existing piano.

**Architecture:** Keep chord-construction music theory in a new `src/music/chordConstruction.ts` module with app-owned teaching metadata. Add focused React components for the family list, detail panel, examples, and workspace switcher. Integrate the workspace in `App` while preserving existing progression behavior and reusing current active-note, MIDI, audio, and piano hint flows.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Tonal, existing CSS in `src/styles.css`.

---

## File Structure

- Create `src/music/chordConstruction.ts`: curated chord catalog, scale helpers, target voicing builder, example generators, and pitch-class matching.
- Create `src/music/__tests__/chordConstruction.test.ts`: domain tests for catalog integrity, formulas, voicings, examples, and matching.
- Create `src/components/WorkspaceTabs.tsx`: top-level tab switcher.
- Create `src/components/ChordConstructionPanel.tsx`: chord workspace state and composition.
- Create `src/components/ChordTypeList.tsx`: grouped chord-family selector.
- Create `src/components/ChordTypeDetail.tsx`: selected chord explanation, target notes, and match status.
- Create `src/components/ChordExampleList.tsx`: scale-native and scale-root example selector.
- Create `src/components/__tests__/ChordConstructionPanel.test.tsx`: focused panel behavior tests.
- Modify `src/music/types.ts`: add chord-construction UI/domain types that must be shared across modules.
- Modify `src/App.tsx`: add workspace state, render the chord workspace, and route piano hints by active workspace.
- Modify `src/components/__tests__/App.test.tsx`: integration tests for workspace switching and live matching.
- Modify `src/styles.css`: tab and chord workspace layout styles.

## Task 1: Add Chord Construction Domain Model

**Files:**
- Create: `src/music/chordConstruction.ts`
- Create: `src/music/__tests__/chordConstruction.test.ts`
- Modify: `src/music/types.ts`

- [ ] **Step 1: Add shared types**

Add these types to `src/music/types.ts` after `ProgressionDisplayMode`:

```ts
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
  id: string;
  family: ChordFamily;
  symbol: string;
  name: string;
  intervals: number[];
  formula: string;
  description: string;
  usage: string;
  feeling: string;
  commonFunctions: ChordFunctionTag[];
  examples: string[];
};

export type ChordConstructionExample = {
  id: string;
  root: string;
  chordName: string;
  target: TargetVoicing;
};
```

- [ ] **Step 2: Write failing domain tests**

Create `src/music/__tests__/chordConstruction.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  CHORD_FAMILY_ORDER,
  CHORD_TYPES,
  buildChordConstructionExamples,
  buildChordTarget,
  buildScalePitchClasses,
  doesPitchClassSetMatchChordTarget,
  getChordTypeById,
  getChordTypesByFamily,
} from "../chordConstruction";

describe("chordConstruction", () => {
  it("defines a unique curated catalog with teaching metadata", () => {
    const ids = CHORD_TYPES.map((type) => type.id);

    expect(new Set(ids).size).toBe(CHORD_TYPES.length);
    expect(ids).toEqual([
      "major",
      "minor",
      "diminished",
      "augmented",
      "sus-2",
      "sus-4",
      "add-9",
      "six",
      "minor-six",
      "dominant-7",
      "major-7",
      "minor-7",
      "minor-7-flat-5",
      "diminished-7",
      "dominant-9",
      "major-9",
      "minor-9",
      "dominant-11",
      "dominant-13",
      "dominant-7-flat-9",
      "dominant-7-sharp-9",
      "dominant-7-flat-5",
      "dominant-7-sharp-5",
    ]);

    CHORD_TYPES.forEach((type) => {
      expect(type.name.length, type.id).toBeGreaterThan(0);
      expect(type.formula.length, type.id).toBeGreaterThan(0);
      expect(type.description.length, type.id).toBeGreaterThan(24);
      expect(type.usage.length, type.id).toBeGreaterThan(24);
      expect(type.feeling.length, type.id).toBeGreaterThan(12);
      expect(type.examples.length, type.id).toBeGreaterThan(0);
    });
  });

  it("groups chord types by family in learner-friendly order", () => {
    expect(CHORD_FAMILY_ORDER).toEqual([
      "triads",
      "suspended-add",
      "sixths",
      "sevenths",
      "extended",
      "altered",
    ]);
    expect(getChordTypesByFamily("triads").map((type) => type.id)).toEqual([
      "major",
      "minor",
      "diminished",
      "augmented",
    ]);
  });

  it("builds target pitch classes and a playable voicing", () => {
    const target = buildChordTarget("C", getChordTypeById("dominant-7"));

    expect(target.pitchClasses).toEqual(["C", "E", "G", "A#"]);
    expect(target.noteNames).toEqual(["C4", "E4", "G4", "A#4"]);
    expect(target.midiNumbers).toEqual([60, 64, 67, 70]);
  });

  it("builds major and minor active scales", () => {
    expect(buildScalePitchClasses("C", "major")).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
    expect(buildScalePitchClasses("A", "minor")).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
    ]);
  });

  it("splits examples into scale-native and scale-root color examples", () => {
    const examples = buildChordConstructionExamples(
      getChordTypeById("major-7"),
      "C",
      "major",
    );

    expect(examples.inScale.map((example) => example.chordName)).toEqual([
      "Cmaj7",
      "Fmaj7",
    ]);
    expect(examples.onScaleRoots).toHaveLength(7);
    expect(examples.onScaleRoots.map((example) => example.chordName)).toContain(
      "Dmaj7",
    );
  });

  it("matches target pitch classes across inversions and rejects extras", () => {
    const target = buildChordTarget("C", getChordTypeById("minor-7"));

    expect(
      doesPitchClassSetMatchChordTarget(["A#", "G", "C", "D#"], target.pitchClasses),
    ).toBe(true);
    expect(
      doesPitchClassSetMatchChordTarget(
        ["A#", "G", "C", "D#", "F"],
        target.pitchClasses,
      ),
    ).toBe(false);
    expect(
      doesPitchClassSetMatchChordTarget(["A#", "G", "C"], target.pitchClasses),
    ).toBe(false);
  });
});
```

- [ ] **Step 3: Run the failing domain tests**

Run:

```bash
npm test -- src/music/__tests__/chordConstruction.test.ts
```

Expected: fail because `src/music/chordConstruction.ts` does not exist.

- [ ] **Step 4: Implement the chord-construction module**

Create `src/music/chordConstruction.ts` with this structure. Fill the catalog with all IDs from the test and keep every entry fully described:

```ts
import { Note } from "tonal";
import { midiToNoteName, noteNameToPitchClass } from "./notes";
import type {
  ChordConstructionExample,
  ChordFamily,
  ChordType,
  KeyMode,
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

export const CHORD_FAMILY_ORDER: ChordFamily[] = [
  "triads",
  "suspended-add",
  "sixths",
  "sevenths",
  "extended",
  "altered",
];

export const CHORD_TYPES: ChordType[] = [
  {
    id: "major",
    family: "triads",
    symbol: "",
    name: "Major",
    intervals: [0, 4, 7],
    formula: "1 3 5",
    description: "Start on the root, add a major third, then add a perfect fifth.",
    usage: "Use it for stable tonic chords, clear cadences, and bright harmonic centers.",
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
    description: "Start with a major triad shape and lower the third by one semitone.",
    usage: "Use it for minor-key tonic chords, softer color, or contrast inside major keys.",
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
    usage: "Use it as a tense passing chord or leading-tone chord that wants to resolve.",
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
    usage: "Use it to create lift, surprise, or a chromatic push into the next chord.",
    feeling: "Floating, bright, unsettled, cinematic.",
    commonFunctions: ["passing", "color"],
    examples: ["Caug -> F", "Gaug -> C"],
  },
];

const ADDITIONAL_CHORD_TYPES: ChordType[] = [
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
    usage: "Use it to delay resolution before returning to a major or minor chord.",
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
    description: "Start with a major triad and add the ninth without adding a seventh.",
    usage: "Use it to make a plain major chord sound wider without making it jazzy.",
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
    usage: "Use it as a warm tonic color in pop, jazz, soul, and older standards.",
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
    usage: "Use it for a minor tonic that feels more sophisticated and less dark.",
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
    usage: "Use it to create pull toward another chord, especially V7 resolving to I.",
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
    usage: "Use it for ii chords, vi chords, minor grooves, and relaxed pre-dominant motion.",
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
    usage: "Use it as ii in minor-key ii-V-i progressions or as a darker passing color.",
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
    description: "Stack three minor thirds from the root for a fully diminished seventh chord.",
    usage: "Use it for strong leading-tone pull, dramatic passing motion, or modulation.",
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
    usage: "Use it for lush tonic color in jazz, neo-soul, R&B, and cinematic harmony.",
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
    usage: "Use it for smooth minor color, especially in jazz, R&B, lo-fi, and neo-soul.",
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
    usage: "Use it for a wide dominant sound, often with some tones omitted in real voicings.",
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
    description: "Start with a dominant seventh and add a ninth lowered by one semitone.",
    usage: "Use it for strong minor-key dominant pull or a darker turnaround color.",
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
    description: "Start with a dominant seventh and add a ninth raised by one semitone.",
    usage: "Use it for blues, funk, rock, and altered dominant tension before resolution.",
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
    usage: "Use it for a dominant chord that pushes upward with extra chromatic color.",
    feeling: "Bright, tense, floating, dramatic.",
    commonFunctions: ["dominant", "color"],
    examples: ["G7#5 -> C", "E7#5 -> Am"],
  },
];

CHORD_TYPES.push(...ADDITIONAL_CHORD_TYPES);

function normalizeSemitone(semitone: number): number {
  return ((semitone % 12) + 12) % 12;
}

function semitoneToPitchClass(semitone: number): string {
  return SHARP_PITCH_CLASSES[normalizeSemitone(semitone)];
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

export function getChordTypeById(id: string): ChordType {
  const type = CHORD_TYPES.find((candidate) => candidate.id === id);

  if (!type) {
    throw new Error(`Unknown chord type ${id}.`);
  }

  return type;
}

export function getChordTypesByFamily(family: ChordFamily): ChordType[] {
  return CHORD_TYPES.filter((type) => type.family === family);
}

export function buildScalePitchClasses(root: string, mode: KeyMode): string[] {
  const rootSemitone = getPitchClassSemitone(root);
  return SCALE_INTERVALS[mode].map((interval) =>
    semitoneToPitchClass(rootSemitone + interval),
  );
}

export function buildChordTarget(root: string, type: ChordType): TargetVoicing {
  const rootSemitone = getPitchClassSemitone(root);
  const pitchClasses = type.intervals.map((interval) =>
    semitoneToPitchClass(rootSemitone + interval),
  );
  const midiNumbers: number[] = [];
  let minimumMidi = TARGET_MINIMUM_MIDI;

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

function buildExample(root: string, type: ChordType): ChordConstructionExample {
  return {
    id: `${type.id}:${root}`,
    root,
    chordName: getChordName(root, type),
    target: buildChordTarget(root, type),
  };
}

export function buildChordConstructionExamples(
  type: ChordType,
  scaleRoot: string,
  mode: KeyMode,
): {
  inScale: ChordConstructionExample[];
  onScaleRoots: ChordConstructionExample[];
} {
  const scalePitchClasses = buildScalePitchClasses(scaleRoot, mode);
  const scaleSet = new Set(scalePitchClasses);
  const onScaleRoots = scalePitchClasses.map((root) => buildExample(root, type));
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
```

- [ ] **Step 5: Run focused domain tests**

Run:

```bash
npm test -- src/music/__tests__/chordConstruction.test.ts
```

Expected: all chord construction domain tests pass.

- [ ] **Step 6: Commit domain model**

Run:

```bash
git add src/music/types.ts src/music/chordConstruction.ts src/music/__tests__/chordConstruction.test.ts
git commit -m "feat: add chord construction domain model"
```

## Task 2: Build Chord Construction Components

**Files:**
- Create: `src/components/ChordConstructionPanel.tsx`
- Create: `src/components/ChordTypeList.tsx`
- Create: `src/components/ChordTypeDetail.tsx`
- Create: `src/components/ChordExampleList.tsx`
- Create: `src/components/__tests__/ChordConstructionPanel.test.tsx`

- [ ] **Step 1: Write failing component tests**

Create `src/components/__tests__/ChordConstructionPanel.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChordConstructionPanel } from "../ChordConstructionPanel";

const defaultProps = {
  activePitchClasses: [],
  appKeyMode: "major" as const,
  appKeyRoot: "C",
  onTargetChange: vi.fn(),
};

describe("ChordConstructionPanel", () => {
  it("renders grouped chord families and beginner teaching content", () => {
    render(<ChordConstructionPanel {...defaultProps} />);

    expect(
      screen.getByRole("region", { name: "Chord construction" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Major" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Triads")).toBeInTheDocument();
    expect(screen.getByText("Suspended & add")).toBeInTheDocument();
    expect(screen.getByText("Formula")).toBeInTheDocument();
    expect(screen.getByText("1 3 5")).toBeInTheDocument();
    expect(screen.getByText("When to use it")).toBeInTheDocument();
    expect(screen.getByText("How it feels")).toBeInTheDocument();
  });

  it("selects chord types and examples", () => {
    const onTargetChange = vi.fn();
    render(
      <ChordConstructionPanel {...defaultProps} onTargetChange={onTargetChange} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dominant seventh" }));

    expect(screen.getByRole("heading", { name: "Dominant seventh" })).toBeInTheDocument();
    expect(screen.getByText("1 3 5 b7")).toBeInTheDocument();
    expect(screen.getByText("Tense, bluesy, directional, wants to resolve.")).toBeInTheDocument();
    expect(screen.getByText("Target notes: C4 E4 G4 A#4")).toBeInTheDocument();

    const inScale = within(screen.getByRole("group", { name: "In this scale" }));
    fireEvent.click(inScale.getByRole("button", { name: "G7" }));

    expect(screen.getByText("Target notes: G4 B4 D5 F5")).toBeInTheDocument();
    expect(onTargetChange).toHaveBeenLastCalledWith([67, 71, 74, 77]);
  });

  it("allows local scale overrides without changing app defaults", () => {
    render(<ChordConstructionPanel {...defaultProps} />);

    fireEvent.change(screen.getByLabelText("Chord root"), {
      target: { value: "D" },
    });
    fireEvent.change(screen.getByLabelText("Chord scale mode"), {
      target: { value: "minor" },
    });

    expect(screen.getByText("D minor")).toBeInTheDocument();
    expect(screen.getByText("Target notes: D4 F#4 A4")).toBeInTheDocument();
  });

  it("shows matched state when active pitch classes equal the selected target", () => {
    render(
      <ChordConstructionPanel
        {...defaultProps}
        activePitchClasses={["G", "E", "C"]}
      />,
    );

    expect(screen.getByText("Matched")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the failing component tests**

Run:

```bash
npm test -- src/components/__tests__/ChordConstructionPanel.test.tsx
```

Expected: fail because the chord construction components do not exist.

- [ ] **Step 3: Implement `ChordTypeList`**

Create `src/components/ChordTypeList.tsx`:

```tsx
import {
  CHORD_FAMILY_ORDER,
  getChordTypesByFamily,
} from "../music/chordConstruction";
import type { ChordFamily } from "../music/types";

type ChordTypeListProps = {
  selectedChordTypeId: string;
  onChordTypeSelect: (chordTypeId: string) => void;
};

const FAMILY_LABELS: Record<ChordFamily, string> = {
  triads: "Triads",
  "suspended-add": "Suspended & add",
  sixths: "Sixths",
  sevenths: "Sevenths",
  extended: "Extended",
  altered: "Altered",
};

export function ChordTypeList({
  selectedChordTypeId,
  onChordTypeSelect,
}: ChordTypeListProps) {
  return (
    <aside className="chord-type-list" aria-label="Chord type families">
      {CHORD_FAMILY_ORDER.map((family) => (
        <section className="chord-type-list__family" key={family}>
          <h3 className="chord-type-list__heading">{FAMILY_LABELS[family]}</h3>
          <div className="chord-type-list__items">
            {getChordTypesByFamily(family).map((type) => {
              const selected = type.id === selectedChordTypeId;

              return (
                <button
                  aria-pressed={selected}
                  className="chord-type-list__button"
                  data-selected={selected}
                  key={type.id}
                  onClick={() => onChordTypeSelect(type.id)}
                  type="button"
                >
                  <span className="chord-type-list__name">{type.name}</span>
                  <span className="chord-type-list__symbol">
                    {type.symbol || "maj"}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </aside>
  );
}
```

- [ ] **Step 4: Implement `ChordExampleList`**

Create `src/components/ChordExampleList.tsx`:

```tsx
import type { ChordConstructionExample } from "../music/types";

type ChordExampleListProps = {
  inScaleExamples: ChordConstructionExample[];
  onScaleRootExamples: ChordConstructionExample[];
  selectedExampleId: string;
  onExampleSelect: (exampleId: string) => void;
};

function renderExamples(
  examples: ChordConstructionExample[],
  selectedExampleId: string,
  onExampleSelect: (exampleId: string) => void,
) {
  return examples.map((example) => {
    const selected = example.id === selectedExampleId;

    return (
      <button
        aria-pressed={selected}
        className="chord-examples__button"
        data-selected={selected}
        key={example.id}
        onClick={() => onExampleSelect(example.id)}
        type="button"
      >
        <span>{example.chordName}</span>
        <span>{example.target.pitchClasses.join(" ")}</span>
      </button>
    );
  });
}

export function ChordExampleList({
  inScaleExamples,
  onScaleRootExamples,
  selectedExampleId,
  onExampleSelect,
}: ChordExampleListProps) {
  return (
    <div className="chord-examples">
      <section aria-label="In this scale" role="group">
        <h3 className="chord-examples__heading">In this scale</h3>
        {inScaleExamples.length > 0 ? (
          <div className="chord-examples__grid">
            {renderExamples(inScaleExamples, selectedExampleId, onExampleSelect)}
          </div>
        ) : (
          <p className="chord-examples__empty">
            No fully scale-native examples for this chord type.
          </p>
        )}
      </section>

      <section aria-label="Try on scale roots" role="group">
        <h3 className="chord-examples__heading">Try on scale roots</h3>
        <div className="chord-examples__grid">
          {renderExamples(onScaleRootExamples, selectedExampleId, onExampleSelect)}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Implement `ChordTypeDetail`**

Create `src/components/ChordTypeDetail.tsx`:

```tsx
import type { ChordType, TargetVoicing } from "../music/types";

type ChordTypeDetailProps = {
  chordName: string;
  chordType: ChordType;
  matched: boolean;
  scaleLabel: string;
  target: TargetVoicing;
};

export function ChordTypeDetail({
  chordName,
  chordType,
  matched,
  scaleLabel,
  target,
}: ChordTypeDetailProps) {
  return (
    <section className="chord-detail" aria-label="Selected chord details">
      <div className="chord-detail__header">
        <div>
          <p className="chord-detail__label">{scaleLabel}</p>
          <h2 className="chord-detail__heading">{chordType.name}</h2>
          <p className="chord-detail__symbol">{chordName}</p>
        </div>
        <span className="chord-detail__match" data-matched={matched}>
          {matched ? "Matched" : "Play the target"}
        </span>
      </div>

      <dl className="chord-detail__facts">
        <div>
          <dt>Formula</dt>
          <dd>{chordType.formula}</dd>
        </div>
        <div>
          <dt>Target notes</dt>
          <dd>Target notes: {target.noteNames.join(" ")}</dd>
        </div>
      </dl>

      <section className="chord-detail__section">
        <h3>How to build it</h3>
        <p>{chordType.description}</p>
      </section>
      <section className="chord-detail__section">
        <h3>When to use it</h3>
        <p>{chordType.usage}</p>
      </section>
      <section className="chord-detail__section">
        <h3>How it feels</h3>
        <p>{chordType.feeling}</p>
      </section>
      <section className="chord-detail__section">
        <h3>Common moves</h3>
        <ul className="chord-detail__examples">
          {chordType.examples.map((example) => (
            <li key={example}>{example}</li>
          ))}
        </ul>
      </section>
    </section>
  );
}
```

- [ ] **Step 6: Implement `ChordConstructionPanel`**

Create `src/components/ChordConstructionPanel.tsx`:

```tsx
import { useEffect, useMemo, useState } from "react";
import { ChordExampleList } from "./ChordExampleList";
import { ChordTypeDetail } from "./ChordTypeDetail";
import { ChordTypeList } from "./ChordTypeList";
import {
  buildChordConstructionExamples,
  buildChordTarget,
  doesPitchClassSetMatchChordTarget,
  getChordTypeById,
} from "../music/chordConstruction";
import type { KeyMode } from "../music/types";

type ChordConstructionPanelProps = {
  activePitchClasses: string[];
  appKeyMode: KeyMode;
  appKeyRoot: string;
  onTargetChange: (midiNumbers: number[]) => void;
};

const KEY_ROOTS = [
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

function formatChordName(root: string, symbol: string): string {
  return `${root}${symbol}`;
}

export function ChordConstructionPanel({
  activePitchClasses,
  appKeyMode,
  appKeyRoot,
  onTargetChange,
}: ChordConstructionPanelProps) {
  const [selectedChordTypeId, setSelectedChordTypeId] = useState("major");
  const [root, setRoot] = useState(appKeyRoot);
  const [mode, setMode] = useState<KeyMode>(appKeyMode);
  const chordType = getChordTypeById(selectedChordTypeId);
  const examples = useMemo(
    () => buildChordConstructionExamples(chordType, root, mode),
    [chordType, mode, root],
  );
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null);
  const selectedExample =
    [...examples.inScale, ...examples.onScaleRoots].find(
      (example) => example.id === selectedExampleId,
    ) ?? null;
  const targetRoot = selectedExample?.root ?? root;
  const target = selectedExample?.target ?? buildChordTarget(targetRoot, chordType);
  const chordName = formatChordName(targetRoot, chordType.symbol);
  const matched = doesPitchClassSetMatchChordTarget(
    activePitchClasses,
    target.pitchClasses,
  );

  useEffect(() => {
    setRoot(appKeyRoot);
    setSelectedExampleId(null);
  }, [appKeyRoot]);

  useEffect(() => {
    setMode(appKeyMode);
    setSelectedExampleId(null);
  }, [appKeyMode]);

  useEffect(() => {
    setSelectedExampleId(null);
  }, [selectedChordTypeId, root, mode]);

  useEffect(() => {
    onTargetChange(target.midiNumbers);
  }, [onTargetChange, target.midiNumbers]);

  return (
    <section className="chord-construction" aria-label="Chord construction">
      <div className="chord-construction__controls">
        <label className="progression-controls__field">
          <span>Chord root</span>
          <select
            aria-label="Chord root"
            value={root}
            onChange={(event) => {
              setRoot(event.target.value);
              setSelectedExampleId(null);
            }}
          >
            {KEY_ROOTS.map((keyRoot) => (
              <option key={keyRoot} value={keyRoot}>
                {keyRoot}
              </option>
            ))}
          </select>
        </label>
        <label className="progression-controls__field">
          <span>Scale mode</span>
          <select
            aria-label="Chord scale mode"
            value={mode}
            onChange={(event) => {
              setMode(event.target.value as KeyMode);
              setSelectedExampleId(null);
            }}
          >
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
        </label>
        <p className="chord-construction__scale">{root} {mode}</p>
      </div>

      <div className="chord-construction__body">
        <ChordTypeList
          selectedChordTypeId={selectedChordTypeId}
          onChordTypeSelect={(chordTypeId) => {
            setSelectedChordTypeId(chordTypeId);
            setSelectedExampleId(null);
          }}
        />
        <div className="chord-construction__detail-stack">
          <ChordTypeDetail
            chordName={chordName}
            chordType={chordType}
            matched={matched}
            scaleLabel={`${root} ${mode}`}
            target={target}
          />
          <ChordExampleList
            inScaleExamples={examples.inScale}
            onExampleSelect={setSelectedExampleId}
            onScaleRootExamples={examples.onScaleRoots}
            selectedExampleId={selectedExampleId ?? ""}
          />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 7: Run focused component tests**

Run:

```bash
npm test -- src/components/__tests__/ChordConstructionPanel.test.tsx
```

Expected: all chord construction panel tests pass.

- [ ] **Step 8: Commit chord construction components**

Run:

```bash
git add src/components/ChordConstructionPanel.tsx src/components/ChordTypeList.tsx src/components/ChordTypeDetail.tsx src/components/ChordExampleList.tsx src/components/__tests__/ChordConstructionPanel.test.tsx
git commit -m "feat: add chord construction panel"
```

## Task 3: Integrate Workspace Switching In App

**Files:**
- Create: `src/components/WorkspaceTabs.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/__tests__/App.test.tsx`

- [ ] **Step 1: Add failing App integration tests**

Append these tests inside `describe("App", () => { ... })` in `src/components/__tests__/App.test.tsx`:

```tsx
  it("switches between progression and chord construction workspaces", () => {
    render(<App />);

    expect(
      screen.getByRole("region", { name: "Progression compass" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Chord Construction" }));

    expect(
      screen.getByRole("region", { name: "Chord construction" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Progression compass" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Recent progression")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Progressions" }));

    expect(
      screen.getByRole("region", { name: "Progression compass" }),
    ).toBeInTheDocument();
  });

  it("uses chord construction targets as piano hints and validates played notes", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Chord Construction" }));
    fireEvent.click(screen.getByRole("button", { name: "Dominant seventh" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "In this scale" })).getByRole(
        "button",
        { name: "G7" },
      ),
    );

    const g4 = screen.getByRole("button", { name: "G4" });
    const b4 = screen.getByRole("button", { name: "B4" });
    const d5 = screen.getByRole("button", { name: "D5" });
    const f5 = screen.getByRole("button", { name: "F5" });

    expect(g4).toHaveAttribute("data-hinted", "true");
    expect(b4).toHaveAttribute("data-hinted", "true");
    expect(d5).toHaveAttribute("data-hinted", "true");
    expect(f5).toHaveAttribute("data-hinted", "true");

    fireEvent.pointerDown(g4, { pointerId: 1 });
    fireEvent.pointerDown(b4, { pointerId: 2 });
    fireEvent.pointerDown(d5, { pointerId: 3 });
    fireEvent.pointerDown(f5, { pointerId: 4 });

    expect(screen.getByText("Matched")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run failing App tests**

Run:

```bash
npm test -- src/components/__tests__/App.test.tsx
```

Expected: fail because workspace tabs and app integration do not exist.

- [ ] **Step 3: Create `WorkspaceTabs`**

Create `src/components/WorkspaceTabs.tsx`:

```tsx
import type { WorkspaceMode } from "../music/types";

type WorkspaceTabsProps = {
  activeWorkspace: WorkspaceMode;
  onWorkspaceChange: (workspace: WorkspaceMode) => void;
};

const WORKSPACES: { id: WorkspaceMode; label: string }[] = [
  { id: "progressions", label: "Progressions" },
  { id: "chord-construction", label: "Chord Construction" },
];

export function WorkspaceTabs({
  activeWorkspace,
  onWorkspaceChange,
}: WorkspaceTabsProps) {
  return (
    <div className="workspace-tabs" role="tablist" aria-label="Learning workspace">
      {WORKSPACES.map((workspace) => (
        <button
          aria-selected={activeWorkspace === workspace.id}
          className="workspace-tabs__tab"
          key={workspace.id}
          onClick={() => onWorkspaceChange(workspace.id)}
          role="tab"
          type="button"
        >
          {workspace.label}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Integrate workspace state in `App`**

In `src/App.tsx`, add imports:

```ts
import { ChordConstructionPanel } from "./components/ChordConstructionPanel";
import { WorkspaceTabs } from "./components/WorkspaceTabs";
```

Add `WorkspaceMode` to the type imports from `./music/types`.

Add state near the other `useState` calls:

```ts
const [activeWorkspace, setActiveWorkspace] =
  useState<WorkspaceMode>("progressions");
const [chordConstructionHintedMidiNumbers, setChordConstructionHintedMidiNumbers] =
  useState<number[]>([]);
```

Replace the `hintedMidiNumbers` calculation with:

```ts
const progressionHintedMidiNumbers =
  progressionDisplayMode === "full-progressions"
    ? activeProgressionStep?.target.midiNumbers ?? []
    : selectedSuggestion?.target.midiNumbers ?? [];
const hintedMidiNumbers =
  activeWorkspace === "chord-construction"
    ? chordConstructionHintedMidiNumbers
    : progressionHintedMidiNumbers;
```

Render `WorkspaceTabs` inside `.app-workspace__readout` before the controls:

```tsx
<WorkspaceTabs
  activeWorkspace={activeWorkspace}
  onWorkspaceChange={setActiveWorkspace}
/>
```

Wrap the existing progression controls, chord readout, progression compass or
practice rail, and progression trail in:

```tsx
{activeWorkspace === "progressions" ? (
  <>
    {/* existing progression controls and panels */}
  </>
) : (
  <ChordConstructionPanel
    activePitchClasses={detection.pitchClasses}
    appKeyMode={keyMode}
    appKeyRoot={progressionKey}
    onTargetChange={setChordConstructionHintedMidiNumbers}
  />
)}
```

Keep `PianoKeyboard` outside that conditional so both workspaces share the same
instrument.

- [ ] **Step 5: Run App tests**

Run:

```bash
npm test -- src/components/__tests__/App.test.tsx
```

Expected: App tests pass.

- [ ] **Step 6: Run focused related tests**

Run:

```bash
npm test -- src/components/__tests__/ChordConstructionPanel.test.tsx src/music/__tests__/chordConstruction.test.ts
```

Expected: all focused chord construction tests pass.

- [ ] **Step 7: Commit App integration**

Run:

```bash
git add src/App.tsx src/components/WorkspaceTabs.tsx src/components/__tests__/App.test.tsx
git commit -m "feat: add chord construction workspace"
```

## Task 4: Add Styling And Final Verification

**Files:**
- Modify: `src/styles.css`
- Modify: `docs/superpowers/plans/2026-05-10-chord-construction.md`

- [ ] **Step 1: Add responsive styles**

Append these styles to `src/styles.css`, then adjust spacing only if browser
verification shows overflow:

```css
.workspace-tabs {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid rgba(243, 245, 241, 0.13);
  border-radius: 0.5rem;
  background: rgba(243, 245, 241, 0.06);
}

.workspace-tabs__tab {
  min-height: 2.5rem;
  border: 0;
  padding: 0 0.875rem;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 750;
}

.workspace-tabs__tab[aria-selected="true"] {
  background: rgba(242, 184, 75, 0.16);
  color: var(--color-text);
}

.chord-construction {
  display: grid;
  gap: 1rem;
}

.chord-construction__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: 0.625rem;
}

.chord-construction__scale {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.9rem;
  font-weight: 750;
}

.chord-construction__body {
  display: grid;
  gap: 1rem;
}

.chord-type-list,
.chord-detail,
.chord-examples {
  border: 1px solid rgba(243, 245, 241, 0.1);
  border-radius: 0.5rem;
  background: rgba(24, 28, 32, 0.86);
  box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, 0.2);
}

.chord-type-list,
.chord-detail,
.chord-examples {
  padding: 1rem;
}

.chord-type-list__family + .chord-type-list__family {
  margin-top: 1rem;
}

.chord-type-list__heading,
.chord-detail__label,
.chord-examples__heading {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.chord-type-list__items,
.chord-examples__grid {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.625rem;
}

.chord-type-list__button,
.chord-examples__button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  width: 100%;
  border: 1px solid rgba(243, 245, 241, 0.13);
  border-radius: 0.5rem;
  padding: 0.65rem 0.75rem;
  background: rgba(243, 245, 241, 0.06);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.chord-type-list__button:hover,
.chord-type-list__button[data-selected="true"],
.chord-examples__button:hover,
.chord-examples__button[data-selected="true"] {
  border-color: rgba(242, 184, 75, 0.55);
  background: rgba(242, 184, 75, 0.13);
}

.chord-type-list__name,
.chord-detail__facts dd,
.chord-examples__button span:first-child {
  font-weight: 800;
}

.chord-type-list__symbol,
.chord-examples__button span:last-child,
.chord-examples__empty {
  color: var(--color-muted);
  font-size: 0.86rem;
}

.chord-construction__detail-stack {
  display: grid;
  gap: 1rem;
}

.chord-detail {
  display: grid;
  gap: 1rem;
}

.chord-detail__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.chord-detail__heading,
.chord-detail__symbol,
.chord-detail__section h3,
.chord-detail__section p,
.chord-detail__facts,
.chord-detail__facts dd,
.chord-examples__empty {
  margin: 0;
}

.chord-detail__heading {
  margin-top: 0.35rem;
  font-size: 1.6rem;
  line-height: 1.1;
}

.chord-detail__symbol {
  margin-top: 0.35rem;
  color: var(--color-accent);
  font-size: 1.05rem;
  font-weight: 800;
}

.chord-detail__match {
  flex: 0 0 auto;
  border-radius: 999px;
  padding: 0.25rem 0.55rem;
  background: rgba(243, 245, 241, 0.08);
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
}

.chord-detail__match[data-matched="true"] {
  background: rgba(142, 232, 220, 0.16);
  color: var(--color-key-white-pressed);
}

.chord-detail__facts {
  display: grid;
  gap: 0.625rem;
}

.chord-detail__facts div {
  display: grid;
  gap: 0.25rem;
}

.chord-detail__facts dt,
.chord-detail__section h3 {
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.chord-detail__section {
  display: grid;
  gap: 0.35rem;
}

.chord-detail__section p,
.chord-detail__examples {
  color: var(--color-muted);
  font-size: 0.92rem;
  line-height: 1.45;
}

.chord-detail__examples {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.chord-detail__examples li {
  border: 1px solid rgba(243, 245, 241, 0.13);
  border-radius: 0.5rem;
  padding: 0.4rem 0.55rem;
  background: rgba(243, 245, 241, 0.06);
  color: var(--color-text);
  font-weight: 750;
}

.chord-examples {
  display: grid;
  gap: 1rem;
}

@media (min-width: 56rem) {
  .chord-construction__body {
    grid-template-columns: minmax(13rem, 0.8fr) minmax(0, 1.6fr);
    align-items: start;
  }
}
```

- [ ] **Step 2: Run unit and component tests**

Run:

```bash
npm test -- src/music/__tests__/chordConstruction.test.ts src/components/__tests__/ChordConstructionPanel.test.tsx src/components/__tests__/App.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 3: Run full verification**

Run:

```bash
make verify
```

Expected: Vitest, TypeScript typechecking, and production build pass.

- [ ] **Step 4: Browser verification**

Run:

```bash
make dev
```

Open the local Vite URL. Verify:

- `Progressions` shows the existing progression controls, chord readout, progression mode toggle, progression panel, progression trail, and piano.
- `Chord Construction` hides progression-specific controls and progression trail.
- Chord families render in the left list on desktop and stack cleanly on mobile.
- Selecting `Dominant seventh` shows formula `1 3 5 b7`, usage, feeling, examples, and target notes.
- Selecting `G7` under `In this scale` highlights `G4 B4 D5 F5`.
- Pressing those notes by pointer or MIDI changes the status to `Matched`.

- [ ] **Step 5: Commit styling and plan**

Run:

```bash
git add src/styles.css docs/superpowers/plans/2026-05-10-chord-construction.md
git commit -m "style: polish chord construction workspace"
```

## Self-Review

- Spec coverage: Tasks cover the top-level workspace switcher, curated chord dictionary, beginner descriptions, usage and feeling copy, scale-native examples, scale-root color examples, piano hints, live exact-match validation, progression workspace preservation, tests, and browser verification.
- Placeholder scan: The plan uses concrete file paths, commands, expected outcomes, and code blocks for every code-writing step.
- Type consistency: Shared types are introduced in Task 1 and reused by the domain helpers, chord components, and App integration tasks with matching names.

## Implementation Notes

- Final review added range-aware chord construction targets so mobile piano
  users only receive highlighted notes that exist inside `MOBILE_PIANO_RANGE`.
  Desktop/default voicings keep the original ascending behavior.
- Final review also added roving keyboard navigation for the workspace tabs:
  Arrow keys, Home, and End move focus and selection between tabs.
