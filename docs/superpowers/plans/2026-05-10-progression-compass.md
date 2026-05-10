# Progression Compass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a genre-aware Progression Compass that suggests, hints, validates, and advances through curated chord progression moves.

**Architecture:** Keep progression logic in focused music-domain modules and let React components consume structured compass view data. `App.tsx` owns selected genre/key and transient selected/matched state, while existing chord detection remains the source of truth for what the user actually played.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Tailwind CSS v4 global CSS, tonal 6, Vitest, Testing Library.

---

## File Structure

- Create `src/music/progressionGraph.ts`: genre/key graph types, curated graph data, and graph lookup.
- Create `src/music/progressionCompass.ts`: transposition, chord labels, suggested voicings, target matching, and compass view helpers.
- Create `src/music/__tests__/progressionGraph.test.ts`: graph coverage and lookup tests.
- Create `src/music/__tests__/progressionCompass.test.ts`: transposition, voicing, and flexible matching tests.
- Create `src/components/ProgressionCompass.tsx`: starter ideas, active node, suggestion cards, selected target details, and matched state.
- Create `src/components/__tests__/ProgressionCompass.test.tsx`: component-only rendering and selection tests.
- Modify `src/music/types.ts`: shared progression compass types.
- Modify `src/components/PianoKeyboard.tsx`: optional hinted MIDI numbers/pitch classes rendered separately from active notes.
- Modify `src/components/__tests__/PianoKeyboard.test.tsx`: hint rendering tests.
- Modify `src/App.tsx`: genre/key state, compass state, selection, match confirmation, and advancement.
- Modify `src/components/__tests__/App.test.tsx`: end-to-end workflow tests using pointer and mocked MIDI input.
- Modify `src/styles.css`: compact controls, compass cards, hint styling, matched styling, and responsive layout.

## Task 1: Shared Types and Curated Graph

**Files:**
- Modify: `src/music/types.ts`
- Create: `src/music/progressionGraph.ts`
- Test: `src/music/__tests__/progressionGraph.test.ts`

- [ ] **Step 1: Add failing graph tests**

Create `src/music/__tests__/progressionGraph.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  PROGRESSION_GENRES,
  getProgressionGraph,
  getProgressionNode,
} from "../progressionGraph";

describe("progressionGraph", () => {
  it("defines the v1 genre set", () => {
    expect(PROGRESSION_GENRES).toEqual([
      "pop",
      "jazz",
      "blues",
      "classical",
      "gospel",
      "neo-soul",
    ]);
  });

  it("provides major and minor graphs for every genre", () => {
    PROGRESSION_GENRES.forEach((genre) => {
      expect(getProgressionGraph(genre, "major").starterNodeIds.length).toBeGreaterThan(0);
      expect(getProgressionGraph(genre, "minor").starterNodeIds.length).toBeGreaterThan(0);
    });
  });

  it("returns directed suggestions for a node", () => {
    const node = getProgressionNode("neo-soul", "major", "Imaj7");

    expect(node.label).toBe("Imaj7");
    expect(node.moves.map((move) => move.to)).toContain("IVmaj7");
    expect(node.moves.some((move) => move.difficulty === "colorful")).toBe(true);
  });

  it("includes richer chord qualities in curated graph data", () => {
    const jazzMinor = getProgressionGraph("jazz", "minor");
    const nodeIds = jazzMinor.nodes.map((node) => node.id);

    expect(nodeIds).toContain("iim7b5");
    expect(nodeIds).toContain("V7alt");
    expect(nodeIds).toContain("viio7");
  });
});
```

- [ ] **Step 2: Run graph tests to verify they fail**

Run:

```sh
npm test -- src/music/__tests__/progressionGraph.test.ts
```

Expected: fail because `src/music/progressionGraph.ts` does not exist and the progression graph exports are missing.

- [ ] **Step 3: Add shared types**

Append these exports to `src/music/types.ts`:

```ts
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
```

- [ ] **Step 4: Create graph module**

Create `src/music/progressionGraph.ts`:

```ts
import type {
  KeyMode,
  ProgressionGenre,
  ProgressionGraph,
  ProgressionGraphNode,
} from "./types";

export const PROGRESSION_GENRES: ProgressionGenre[] = [
  "pop",
  "jazz",
  "blues",
  "classical",
  "gospel",
  "neo-soul",
];

function node(
  id: string,
  degree: number,
  quality: string,
  displayQuality: string,
  moves: ProgressionGraphNode["moves"],
  accidental = 0,
): ProgressionGraphNode {
  return { id, label: id, degree, accidental, quality, displayQuality, moves };
}

const commonMajorNodes: ProgressionGraphNode[] = [
  node("I", 1, "M", "", [
    { to: "vi", difficulty: "basic", functionLabel: "common", reason: "vi keeps the harmony familiar while changing color." },
    { to: "IV", difficulty: "basic", functionLabel: "smooth", reason: "IV gives a clear lift away from home." },
    { to: "V7", difficulty: "colorful", functionLabel: "tension", reason: "V7 creates pull back toward I." },
  ]),
  node("vi", 6, "m", "m", [
    { to: "IV", difficulty: "basic", functionLabel: "smooth", reason: "vi to IV is a common pop handoff." },
    { to: "ii", difficulty: "colorful", functionLabel: "smooth", reason: "ii sets up a stronger move toward V." },
  ]),
  node("IV", 4, "M", "", [
    { to: "I", difficulty: "basic", functionLabel: "resolve", reason: "IV can settle gently back to I." },
    { to: "V7", difficulty: "basic", functionLabel: "tension", reason: "IV to V7 builds a direct cadence." },
  ]),
  node("V7", 5, "7", "7", [
    { to: "I", difficulty: "basic", functionLabel: "resolve", reason: "V7 strongly resolves to I." },
    { to: "vi", difficulty: "colorful", functionLabel: "spicy", reason: "Moving to vi gives a deceptive cadence." },
  ]),
  node("ii", 2, "m", "m", [
    { to: "V7", difficulty: "basic", functionLabel: "tension", reason: "ii to V7 is a classic setup for resolution." },
  ]),
];

const commonMinorNodes: ProgressionGraphNode[] = [
  node("i", 1, "m", "m", [
    { to: "VI", difficulty: "basic", functionLabel: "smooth", reason: "VI opens the minor key with a broad color." },
    { to: "iv", difficulty: "basic", functionLabel: "smooth", reason: "iv keeps the sound grounded in minor." },
    { to: "V7", difficulty: "colorful", functionLabel: "tension", reason: "V7 adds harmonic-minor pull back to i." },
  ]),
  node("iv", 4, "m", "m", [
    { to: "i", difficulty: "basic", functionLabel: "resolve", reason: "iv returns naturally to i." },
    { to: "V7", difficulty: "colorful", functionLabel: "tension", reason: "iv to V7 creates a strong minor cadence." },
  ]),
  node("VI", 6, "M", "", [
    { to: "III", difficulty: "basic", functionLabel: "smooth", reason: "VI to III is a familiar minor-key lift." },
    { to: "VII", difficulty: "basic", functionLabel: "common", reason: "VII keeps the progression moving stepwise." },
  ]),
  node("III", 3, "M", "", [
    { to: "VII", difficulty: "basic", functionLabel: "common", reason: "III to VII keeps a broad minor pop sound." },
  ]),
  node("VII", 7, "M", "", [
    { to: "i", difficulty: "basic", functionLabel: "resolve", reason: "VII falls back into the minor tonic." },
  ]),
  node("V7", 5, "7", "7", [
    { to: "i", difficulty: "basic", functionLabel: "resolve", reason: "V7 resolves strongly into minor i." },
  ]),
];

function graph(
  genre: ProgressionGenre,
  mode: KeyMode,
  starterNodeIds: string[],
  nodes: ProgressionGraphNode[],
): ProgressionGraph {
  return { genre, mode, starterNodeIds, nodes };
}

const graphs: Record<ProgressionGenre, Record<KeyMode, ProgressionGraph>> = {
  pop: {
    major: graph("pop", "major", ["I", "vi", "IV"], commonMajorNodes),
    minor: graph("pop", "minor", ["i", "VI", "VII"], commonMinorNodes),
  },
  jazz: {
    major: graph("jazz", "major", ["Imaj7", "ii7", "V7"], [
      node("Imaj7", 1, "maj7", "maj7", [
        { to: "vi7", difficulty: "colorful", functionLabel: "smooth", reason: "vi7 extends the key center with a soft color." },
        { to: "ii7", difficulty: "basic", functionLabel: "common", reason: "ii7 begins the core ii-V-I motion." },
      ]),
      node("ii7", 2, "m7", "m7", [
        { to: "V7", difficulty: "basic", functionLabel: "tension", reason: "ii7 usually points toward V7 in jazz." },
        { to: "bII7", difficulty: "advanced", functionLabel: "spicy", reason: "bII7 is a tritone substitute leading back to I." },
      ]),
      node("V7", 5, "7", "7", [
        { to: "Imaj7", difficulty: "basic", functionLabel: "resolve", reason: "V7 resolves to Imaj7." },
        { to: "vi7", difficulty: "colorful", functionLabel: "spicy", reason: "V7 to vi7 delays the expected resolution." },
      ]),
      node("vi7", 6, "m7", "m7", [
        { to: "ii7", difficulty: "basic", functionLabel: "common", reason: "vi7 cycles smoothly into ii7." },
      ]),
      node("bII7", 2, "7", "7", [
        { to: "Imaj7", difficulty: "advanced", functionLabel: "resolve", reason: "bII7 slides down by half step into Imaj7." },
      ], -1),
    ]),
    minor: graph("jazz", "minor", ["i7", "iim7b5", "V7alt"], [
      node("i7", 1, "m7", "m7", [
        { to: "iim7b5", difficulty: "colorful", functionLabel: "smooth", reason: "iim7b5 starts the minor ii-V-i sound." },
        { to: "iv7", difficulty: "basic", functionLabel: "smooth", reason: "iv7 stays inside the minor color." },
      ]),
      node("iim7b5", 2, "m7b5", "m7b5", [
        { to: "V7alt", difficulty: "advanced", functionLabel: "tension", reason: "V7alt gives the strongest jazz pull back to i." },
      ]),
      node("V7alt", 5, "7", "7alt", [
        { to: "i7", difficulty: "advanced", functionLabel: "resolve", reason: "Altered dominant color resolves to minor i." },
      ]),
      node("iv7", 4, "m7", "m7", [
        { to: "viio7", difficulty: "advanced", functionLabel: "tension", reason: "viio7 creates a tight leading-tone pull." },
      ]),
      node("viio7", 7, "dim7", "dim7", [
        { to: "i7", difficulty: "advanced", functionLabel: "resolve", reason: "The diminished leading-tone chord resolves to i." },
      ]),
    ]),
  },
  blues: {
    major: graph("blues", "major", ["I7", "IV7", "V7"], [
      node("I7", 1, "7", "7", [
        { to: "IV7", difficulty: "basic", functionLabel: "common", reason: "I7 to IV7 is the center of the blues form." },
        { to: "V7", difficulty: "basic", functionLabel: "tension", reason: "V7 turns the blues back toward I7." },
      ]),
      node("IV7", 4, "7", "7", [
        { to: "I7", difficulty: "basic", functionLabel: "resolve", reason: "IV7 returns to the home dominant sound." },
        { to: "#IVdim7", difficulty: "advanced", functionLabel: "spicy", reason: "#IVdim7 is a passing chord into I or V." },
      ]),
      node("V7", 5, "7", "7", [
        { to: "IV7", difficulty: "basic", functionLabel: "common", reason: "V7 to IV7 is the classic blues turnaround descent." },
        { to: "I7", difficulty: "basic", functionLabel: "resolve", reason: "V7 can also resolve straight home." },
      ]),
      node("#IVdim7", 4, "dim7", "dim7", [
        { to: "I7", difficulty: "advanced", functionLabel: "resolve", reason: "The diminished passing chord slides back to I7." },
      ], 1),
    ]),
    minor: graph("blues", "minor", ["i7", "iv7", "V7"], [
      node("i7", 1, "m7", "m7", [
        { to: "iv7", difficulty: "basic", functionLabel: "common", reason: "i7 to iv7 gives the minor blues movement." },
        { to: "V7", difficulty: "colorful", functionLabel: "tension", reason: "V7 turns the minor blues back home." },
      ]),
      node("iv7", 4, "m7", "m7", [
        { to: "i7", difficulty: "basic", functionLabel: "resolve", reason: "iv7 settles back into the tonic minor sound." },
      ]),
      node("V7", 5, "7", "7", [
        { to: "i7", difficulty: "basic", functionLabel: "resolve", reason: "V7 pulls back into i7." },
      ]),
    ]),
  },
  classical: {
    major: graph("classical", "major", ["I", "IV", "V7"], commonMajorNodes),
    minor: graph("classical", "minor", ["i", "iv", "V7"], [
      ...commonMinorNodes,
      node("viio7", 7, "dim7", "dim7", [
        { to: "i", difficulty: "advanced", functionLabel: "resolve", reason: "viio7 is a leading-tone chord that resolves to i." },
      ]),
    ]),
  },
  gospel: {
    major: graph("gospel", "major", ["I", "IV", "ii7"], [
      ...commonMajorNodes,
      node("ii7", 2, "m7", "m7", [
        { to: "V7sus4", difficulty: "colorful", functionLabel: "tension", reason: "V7sus4 gives a gospel-style suspended pull." },
      ]),
      node("V7sus4", 5, "7sus4", "7sus4", [
        { to: "I", difficulty: "colorful", functionLabel: "resolve", reason: "The suspension releases into I." },
      ]),
      node("V/V", 2, "7", "7", [
        { to: "V7", difficulty: "advanced", functionLabel: "tension", reason: "Secondary dominant points toward V7." },
      ]),
    ]),
    minor: graph("gospel", "minor", ["i", "iv", "V7"], [
      ...commonMinorNodes,
      node("ivm7", 4, "m7", "m7", [
        { to: "V7sus4", difficulty: "colorful", functionLabel: "tension", reason: "Suspended dominant color prepares the return to i." },
      ]),
      node("V7sus4", 5, "7sus4", "7sus4", [
        { to: "i", difficulty: "colorful", functionLabel: "resolve", reason: "The suspended dominant resolves to minor i." },
      ]),
    ]),
  },
  "neo-soul": {
    major: graph("neo-soul", "major", ["Imaj7", "IVmaj7", "ii7"], [
      node("Imaj7", 1, "maj7", "maj7", [
        { to: "IVmaj7", difficulty: "colorful", functionLabel: "smooth", reason: "IVmaj7 gives a warm lift from Imaj7." },
        { to: "vi7", difficulty: "colorful", functionLabel: "common", reason: "vi7 keeps the sound mellow and connected." },
        { to: "bVII13sus", difficulty: "advanced", functionLabel: "spicy", reason: "bVII13sus borrows a rich dominant color." },
      ]),
      node("IVmaj7", 4, "maj7", "maj7", [
        { to: "ii7", difficulty: "colorful", functionLabel: "smooth", reason: "IVmaj7 to ii7 moves by shared tones." },
        { to: "Imaj7", difficulty: "basic", functionLabel: "resolve", reason: "Returning to Imaj7 settles the color." },
      ]),
      node("ii7", 2, "m7", "m7", [
        { to: "V7sus4", difficulty: "colorful", functionLabel: "tension", reason: "V7sus4 adds suspended movement without sounding too final." },
      ]),
      node("vi7", 6, "m7", "m7", [
        { to: "IVmaj7", difficulty: "basic", functionLabel: "smooth", reason: "vi7 flows naturally into IVmaj7." },
      ]),
      node("V7sus4", 5, "7sus4", "7sus4", [
        { to: "Imaj7", difficulty: "colorful", functionLabel: "resolve", reason: "The suspended dominant resolves into Imaj7." },
      ]),
      node("bVII13sus", 7, "13sus4", "13sus", [
        { to: "Imaj7", difficulty: "advanced", functionLabel: "resolve", reason: "Borrowed bVII color relaxes back into Imaj7." },
      ], -1),
    ]),
    minor: graph("neo-soul", "minor", ["i9", "iv9", "bVImaj7"], [
      node("i9", 1, "m9", "m9", [
        { to: "iv9", difficulty: "colorful", functionLabel: "smooth", reason: "iv9 deepens the minor color." },
        { to: "bVImaj7", difficulty: "colorful", functionLabel: "common", reason: "bVImaj7 gives a lush modal shift." },
      ]),
      node("iv9", 4, "m9", "m9", [
        { to: "i9", difficulty: "basic", functionLabel: "resolve", reason: "iv9 returns smoothly to i9." },
        { to: "V7sus4", difficulty: "advanced", functionLabel: "tension", reason: "Suspended dominant color prepares the return." },
      ]),
      node("bVImaj7", 6, "maj7", "maj7", [
        { to: "V7sus4", difficulty: "advanced", functionLabel: "tension", reason: "bVImaj7 can slide into a suspended dominant." },
      ]),
      node("V7sus4", 5, "7sus4", "7sus4", [
        { to: "i9", difficulty: "colorful", functionLabel: "resolve", reason: "V7sus4 releases back to the minor tonic color." },
      ]),
    ]),
  },
};

export function getProgressionGraph(
  genre: ProgressionGenre,
  mode: KeyMode,
): ProgressionGraph {
  return graphs[genre][mode];
}

export function getProgressionNode(
  genre: ProgressionGenre,
  mode: KeyMode,
  nodeId: string,
): ProgressionGraphNode {
  const node = getProgressionGraph(genre, mode).nodes.find(
    (candidate) => candidate.id === nodeId,
  );

  if (!node) {
    throw new Error(`Unknown progression node ${nodeId} for ${genre} ${mode}.`);
  }

  return node;
}
```

- [ ] **Step 5: Run graph tests**

Run:

```sh
npm test -- src/music/__tests__/progressionGraph.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit graph foundation**

Run:

```sh
git add src/music/types.ts src/music/progressionGraph.ts src/music/__tests__/progressionGraph.test.ts
git commit -m "feat: add curated progression graph"
```

## Task 2: Compass Domain Helpers

**Files:**
- Create: `src/music/progressionCompass.ts`
- Test: `src/music/__tests__/progressionCompass.test.ts`

- [ ] **Step 1: Add failing compass helper tests**

Create `src/music/__tests__/progressionCompass.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  buildCompassNodeView,
  buildProgressionSuggestions,
  buildTargetVoicingForNode,
  doesPitchClassSetMatchTarget,
  findMatchingSuggestion,
  getStarterSuggestions,
} from "../progressionCompass";
import type { ProgressionSuggestion } from "../types";

describe("progressionCompass", () => {
  it("transposes starter suggestions into concrete chord names", () => {
    const starters = getStarterSuggestions("pop", "major", "D");

    expect(starters.map((suggestion) => suggestion.displayName)).toEqual([
      "I (D)",
      "vi (Bm)",
      "IV (G)",
    ]);
    expect(starters[0].target.noteNames).toEqual(["D4", "F#4", "A4"]);
  });

  it("builds next suggestions with labels, reasons, and target voicings", () => {
    const current = buildCompassNodeView("neo-soul", "major", "C", "Imaj7");
    const suggestions = buildProgressionSuggestions(
      "neo-soul",
      "major",
      "C",
      current.nodeId,
    );

    expect(current.displayName).toBe("Imaj7 (Cmaj7)");
    expect(suggestions.map((suggestion) => suggestion.displayName)).toContain(
      "IVmaj7 (Fmaj7)",
    );
    expect(suggestions[0]).toMatchObject({
      difficulty: "colorful",
      functionLabel: "smooth",
    });
    expect(suggestions[0].target.midiNumbers.length).toBeGreaterThanOrEqual(4);
  });

  it("builds target pitch classes for graph nodes", () => {
    const target = buildTargetVoicingForNode("pop", "major", "C", "I");

    expect(target.pitchClasses).toEqual(["C", "E", "G"]);
    expect(doesPitchClassSetMatchTarget(["E", "G", "C"], target.pitchClasses)).toBe(true);
  });

  it("matches a selected target across inversions and octaves", () => {
    const [target] = buildProgressionSuggestions("pop", "major", "C", "I");
    const matched = findMatchingSuggestion([target], ["A", "C", "E"]);

    expect(target.displayName).toBe("vi (Am)");
    expect(matched?.id).toBe(target.id);
  });

  it("does not match incomplete pitch-class sets", () => {
    const [target] = buildProgressionSuggestions("pop", "major", "C", "I");

    expect(findMatchingSuggestion([target], ["A", "C"])).toBeNull();
  });

  it("supports richer qualities in generated labels", () => {
    const suggestions = buildProgressionSuggestions("jazz", "minor", "A", "iim7b5");
    const altered = suggestions.find(
      (suggestion: ProgressionSuggestion) => suggestion.nodeId === "V7alt",
    );

    expect(altered?.displayName).toBe("V7alt (E7)");
    expect(altered?.difficulty).toBe("advanced");
  });
});
```

- [ ] **Step 2: Run helper tests to verify they fail**

Run:

```sh
npm test -- src/music/__tests__/progressionCompass.test.ts
```

Expected: fail because `src/music/progressionCompass.ts` does not exist.

- [ ] **Step 3: Implement compass helpers**

Create `src/music/progressionCompass.ts`:

```ts
import { Note } from "tonal";
import { getProgressionGraph, getProgressionNode } from "./progressionGraph";
import { midiToNoteName, noteNameToPitchClass } from "./notes";
import type {
  CompassNodeView,
  KeyMode,
  ProgressionGenre,
  ProgressionGraphNode,
  ProgressionSuggestion,
  TargetVoicing,
} from "./types";

const MAJOR_SCALE_INTERVALS = [0, 2, 4, 5, 7, 9, 11];
const MINOR_SCALE_INTERVALS = [0, 2, 3, 5, 7, 8, 10];

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

const PITCH_CLASSES_SHARP = [
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

function pitchClassToSemitone(pitchClass: string): number {
  const normalized = Note.get(pitchClass).pc;
  const chroma = Note.get(normalized).chroma;

  if (chroma === undefined) {
    throw new Error(`Unable to read pitch class ${pitchClass}.`);
  }

  return chroma;
}

function semitoneToPitchClass(semitone: number): string {
  return PITCH_CLASSES_SHARP[((semitone % 12) + 12) % 12];
}

function transposeNodeRoot(
  keyRoot: string,
  mode: KeyMode,
  node: ProgressionGraphNode,
): string {
  const keySemitone = pitchClassToSemitone(keyRoot);
  const scale = mode === "major" ? MAJOR_SCALE_INTERVALS : MINOR_SCALE_INTERVALS;
  const scaleOffset = scale[node.degree - 1];

  return semitoneToPitchClass(keySemitone + scaleOffset + (node.accidental ?? 0));
}

function chordNameFor(root: string, quality: string): string {
  if (quality === "M" || quality === "") {
    return root;
  }

  return `${root}${quality}`;
}

function pitchClassesFor(root: string, quality: string): string[] {
  const intervals = QUALITY_INTERVALS[quality];

  if (!intervals) {
    throw new Error(`Unsupported progression quality ${quality}.`);
  }

  const rootSemitone = pitchClassToSemitone(root);

  return intervals.map((interval) => semitoneToPitchClass(rootSemitone + interval));
}

function midiForPitchClassNearMiddleC(pitchClass: string, minimumMidi: number): number {
  for (let midi = minimumMidi; midi <= 84; midi += 1) {
    if (noteNameToPitchClass(midiToNoteName(midi)) === pitchClass) {
      return midi;
    }
  }

  throw new Error(`Unable to voice pitch class ${pitchClass}.`);
}

function buildTargetVoicing(root: string, quality: string): TargetVoicing {
  const pitchClasses = pitchClassesFor(root, quality);
  let minimumMidi = 57;
  const midiNumbers = pitchClasses.map((pitchClass) => {
    const midi = midiForPitchClassNearMiddleC(pitchClass, minimumMidi);
    minimumMidi = midi + 1;
    return midi;
  });

  return {
    noteNames: midiNumbers.map(midiToNoteName),
    midiNumbers,
    pitchClasses,
  };
}

export function buildCompassNodeView(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  nodeId: string,
): CompassNodeView {
  const node = getProgressionNode(genre, mode, nodeId);
  const root = transposeNodeRoot(keyRoot, mode, node);
  const chordName = chordNameFor(root, node.quality);

  return {
    nodeId: node.id,
    romanNumeral: node.label,
    chordName,
    displayName: `${node.label} (${chordName})`,
  };
}

export function buildTargetVoicingForNode(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  nodeId: string,
): TargetVoicing {
  const node = getProgressionNode(genre, mode, nodeId);
  const root = transposeNodeRoot(keyRoot, mode, node);

  return buildTargetVoicing(root, node.quality);
}

function buildSuggestionFromNode(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  move: ProgressionGraphNode["moves"][number],
): ProgressionSuggestion {
  const node = getProgressionNode(genre, mode, move.to);
  const root = transposeNodeRoot(keyRoot, mode, node);
  const chordName = chordNameFor(root, node.quality);

  return {
    id: `${node.id}:${move.functionLabel}`,
    nodeId: node.id,
    romanNumeral: node.label,
    chordName,
    displayName: `${node.label} (${chordName})`,
    difficulty: move.difficulty,
    functionLabel: move.functionLabel,
    reason: move.reason,
    target: buildTargetVoicing(root, node.quality),
  };
}

export function buildProgressionSuggestions(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  currentNodeId: string,
): ProgressionSuggestion[] {
  const currentNode = getProgressionNode(genre, mode, currentNodeId);

  return currentNode.moves.map((move) =>
    buildSuggestionFromNode(genre, mode, keyRoot, move),
  );
}

export function getStarterSuggestions(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
): ProgressionSuggestion[] {
  const graph = getProgressionGraph(genre, mode);

  return graph.starterNodeIds.map((nodeId) => {
    const node = getProgressionNode(genre, mode, nodeId);
    const root = transposeNodeRoot(keyRoot, mode, node);
    const chordName = chordNameFor(root, node.quality);

    return {
      id: `starter:${node.id}`,
      nodeId: node.id,
      romanNumeral: node.label,
      chordName,
      displayName: `${node.label} (${chordName})`,
      difficulty: "basic",
      functionLabel: "common",
      reason: "Use this as a starting point for the selected genre and key.",
      target: buildTargetVoicing(root, node.quality),
    };
  });
}

function normalizePitchClasses(pitchClasses: string[]): string[] {
  const normalized: string[] = [];

  pitchClasses.forEach((pitchClass) => {
    const parsed = Note.get(pitchClass).pc;

    if (parsed) {
      normalized.push(parsed);
    }
  });

  return Array.from(new Set(normalized)).sort();
}

export function doesPitchClassSetMatchTarget(
  playedPitchClasses: string[],
  targetPitchClasses: string[],
): boolean {
  const played = normalizePitchClasses(playedPitchClasses);
  const target = normalizePitchClasses(targetPitchClasses);

  return (
    played.length === target.length &&
    target.every((pitchClass, index) => pitchClass === played[index])
  );
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
```

- [ ] **Step 4: Run helper tests**

Run:

```sh
npm test -- src/music/__tests__/progressionCompass.test.ts
```

Expected: pass.

- [ ] **Step 5: Run graph and compass tests together**

Run:

```sh
npm test -- src/music/__tests__/progressionGraph.test.ts src/music/__tests__/progressionCompass.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit compass helpers**

Run:

```sh
git add src/music/progressionCompass.ts src/music/__tests__/progressionCompass.test.ts
git commit -m "feat: add progression compass helpers"
```

## Task 3: Piano Target Hints

**Files:**
- Modify: `src/components/PianoKeyboard.tsx`
- Modify: `src/components/__tests__/PianoKeyboard.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add failing piano hint test**

Append to `src/components/__tests__/PianoKeyboard.test.tsx`:

```ts
  it("marks hinted target keys separately from active keys", () => {
    render(
      <PianoKeyboard
        activeMidiNumbers={[60]}
        hintedMidiNumbers={[60, 64, 67]}
        onNoteDown={vi.fn()}
        onNoteUp={vi.fn()}
        range={MOBILE_PIANO_RANGE}
      />,
    );

    expect(screen.getByRole("button", { name: "C4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "E4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "D4" })).toHaveAttribute(
      "data-hinted",
      "false",
    );
    expect(screen.getByRole("button", { name: "C4" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });
```

- [ ] **Step 2: Run keyboard test to verify it fails**

Run:

```sh
npm test -- src/components/__tests__/PianoKeyboard.test.tsx -t "marks hinted target keys"
```

Expected: fail because `hintedMidiNumbers` is not a supported prop.

- [ ] **Step 3: Implement hinted keys**

In `src/components/PianoKeyboard.tsx`, update the prop type:

```ts
type PianoKeyboardProps = {
  activeMidiNumbers: number[];
  hintedMidiNumbers?: number[];
  interactionMode?: PianoInteractionMode;
  latchedMidiNumbers?: number[];
  range: PianoRange;
  onNoteDown: (midi: number) => void;
  onNoteUp: (midi: number) => void;
};
```

Update the component destructuring and sets:

```ts
export function PianoKeyboard({
  activeMidiNumbers,
  hintedMidiNumbers = [],
  interactionMode = "hold",
  latchedMidiNumbers = activeMidiNumbers,
  range,
  onNoteDown,
  onNoteUp,
}: PianoKeyboardProps) {
  const heldKeyboardMidiRef = useRef<Set<number>>(new Set());
  const heldPointerIdsRef = useRef<Map<number, number>>(new Map());
  const keys = positionKeys(buildPianoKeys(range));
  const activeSet = new Set(activeMidiNumbers);
  const hintedSet = new Set(hintedMidiNumbers);
  const latchedSet = new Set(latchedMidiNumbers);
```

Inside `renderKey`, add the hinted state and attribute:

```ts
    const isActive = activeSet.has(key.midi);
    const isHinted = hintedSet.has(key.midi);
```

Add this attribute to the `button`:

```tsx
        data-hinted={isHinted}
```

- [ ] **Step 4: Add hint styles**

In `src/styles.css`, after the existing active key rules, add:

```css
.piano-key--white[data-hinted="true"] {
  box-shadow: inset 0 0 0 3px rgba(242, 184, 75, 0.72);
}

.piano-key--black[data-hinted="true"] {
  box-shadow:
    inset 0 0 0 2px rgba(242, 184, 75, 0.82),
    0 0.75rem 1.25rem rgba(0, 0, 0, 0.46);
}
```

- [ ] **Step 5: Run keyboard tests**

Run:

```sh
npm test -- src/components/__tests__/PianoKeyboard.test.tsx
```

Expected: pass.

- [ ] **Step 6: Commit piano hints**

Run:

```sh
git add src/components/PianoKeyboard.tsx src/components/__tests__/PianoKeyboard.test.tsx src/styles.css
git commit -m "feat: hint progression target keys"
```

## Task 4: Progression Compass Component

**Files:**
- Create: `src/components/ProgressionCompass.tsx`
- Create: `src/components/__tests__/ProgressionCompass.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add failing component tests**

Create `src/components/__tests__/ProgressionCompass.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProgressionCompass } from "../ProgressionCompass";
import type { CompassNodeView, ProgressionSuggestion } from "../../music/types";

const starter: ProgressionSuggestion = {
  id: "starter:I",
  nodeId: "I",
  romanNumeral: "I",
  chordName: "C",
  displayName: "I (C)",
  difficulty: "basic",
  functionLabel: "common",
  reason: "Use this as a starting point for the selected genre and key.",
  target: {
    noteNames: ["C4", "E4", "G4"],
    midiNumbers: [60, 64, 67],
    pitchClasses: ["C", "E", "G"],
  },
};

const current: CompassNodeView = {
  nodeId: "I",
  romanNumeral: "I",
  chordName: "C",
  displayName: "I (C)",
};

const next: ProgressionSuggestion = {
  ...starter,
  id: "vi:common",
  nodeId: "vi",
  romanNumeral: "vi",
  chordName: "Am",
  displayName: "vi (Am)",
  reason: "vi keeps the harmony familiar while changing color.",
  target: {
    noteNames: ["A3", "C4", "E4"],
    midiNumbers: [57, 60, 64],
    pitchClasses: ["A", "C", "E"],
  },
};

describe("ProgressionCompass", () => {
  it("renders starter ideas before an active node exists", () => {
    render(
      <ProgressionCompass
        currentNode={null}
        matchedSuggestionId={null}
        onSuggestionSelect={vi.fn()}
        selectedSuggestionId="starter:I"
        suggestions={[starter]}
      />,
    );

    expect(screen.getByRole("region", { name: "Progression compass" })).toBeInTheDocument();
    expect(screen.getByText("Starter ideas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I (C)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Press C4 E4 G4")).toBeInTheDocument();
  });

  it("renders active next moves and selection", () => {
    const onSuggestionSelect = vi.fn();

    render(
      <ProgressionCompass
        currentNode={current}
        matchedSuggestionId={null}
        onSuggestionSelect={onSuggestionSelect}
        selectedSuggestionId={next.id}
        suggestions={[next]}
      />,
    );

    expect(screen.getByText("You are here")).toBeInTheDocument();
    expect(screen.getByText("I (C)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "vi (Am)" }));

    expect(onSuggestionSelect).toHaveBeenCalledWith(next.id);
  });

  it("marks a matched suggestion", () => {
    render(
      <ProgressionCompass
        currentNode={current}
        matchedSuggestionId={next.id}
        onSuggestionSelect={vi.fn()}
        selectedSuggestionId={next.id}
        suggestions={[next]}
      />,
    );

    expect(screen.getByRole("button", { name: "vi (Am)" })).toHaveAttribute(
      "data-matched",
      "true",
    );
  });
});
```

- [ ] **Step 2: Run component tests to verify they fail**

Run:

```sh
npm test -- src/components/__tests__/ProgressionCompass.test.tsx
```

Expected: fail because `ProgressionCompass.tsx` does not exist.

- [ ] **Step 3: Implement component**

Create `src/components/ProgressionCompass.tsx`:

```tsx
import type { CompassNodeView, ProgressionSuggestion } from "../music/types";

type ProgressionCompassProps = {
  currentNode: CompassNodeView | null;
  suggestions: ProgressionSuggestion[];
  selectedSuggestionId: string | null;
  matchedSuggestionId: string | null;
  onSuggestionSelect: (suggestionId: string) => void;
};

function labelText(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ProgressionCompass({
  currentNode,
  suggestions,
  selectedSuggestionId,
  matchedSuggestionId,
  onSuggestionSelect,
}: ProgressionCompassProps) {
  return (
    <section className="progression-compass" aria-label="Progression compass">
      <div className="progression-compass__header">
        <div>
          <p className="progression-compass__label">
            {currentNode ? "You are here" : "Starter ideas"}
          </p>
          <h2 className="progression-compass__heading">
            {currentNode?.displayName ?? "Choose a first chord"}
          </h2>
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div className="progression-compass__suggestions">
          {suggestions.map((suggestion) => {
            const selected = suggestion.id === selectedSuggestionId;
            const matched = suggestion.id === matchedSuggestionId;

            return (
              <button
                aria-pressed={selected}
                aria-label={suggestion.displayName}
                className="progression-compass__card"
                data-matched={matched}
                data-selected={selected}
                key={suggestion.id}
                onClick={() => onSuggestionSelect(suggestion.id)}
                type="button"
              >
                <span className="progression-compass__card-title">
                  {suggestion.displayName}
                </span>
                <span className="progression-compass__meta">
                  {labelText(suggestion.functionLabel)} · {labelText(suggestion.difficulty)}
                </span>
                <span className="progression-compass__keys">
                  Press {suggestion.target.noteNames.join(" ")}
                </span>
                <span className="progression-compass__reason">
                  {suggestion.reason}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="progression-compass__empty">
          No curated moves for this chord in this genre yet.
        </p>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Add component styles**

In `src/styles.css`, add `progression-compass` selectors to the margin reset group:

```css
.progression-compass__label,
.progression-compass__heading,
.progression-compass__empty {
  margin: 0;
}
```

After `.progression-trail` styles, add:

```css
.progression-compass {
  border: 1px solid rgba(243, 245, 241, 0.1);
  border-radius: 0.5rem;
  padding: 1rem;
  background: rgba(24, 28, 32, 0.86);
  box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, 0.2);
}

.progression-compass__header {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 1rem;
}

.progression-compass__label {
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.progression-compass__heading {
  margin-top: 0.35rem;
  font-size: 1.35rem;
  line-height: 1.1;
}

.progression-compass__suggestions {
  display: grid;
  gap: 0.625rem;
  margin-top: 0.875rem;
}

.progression-compass__card {
  display: grid;
  gap: 0.35rem;
  width: 100%;
  border: 1px solid rgba(243, 245, 241, 0.13);
  border-radius: 0.5rem;
  padding: 0.75rem;
  background: rgba(243, 245, 241, 0.06);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.progression-compass__card:hover,
.progression-compass__card[data-selected="true"] {
  border-color: rgba(242, 184, 75, 0.55);
  background: rgba(242, 184, 75, 0.13);
}

.progression-compass__card[data-matched="true"] {
  border-color: rgba(142, 232, 220, 0.78);
  background: rgba(142, 232, 220, 0.16);
}

.progression-compass__card-title {
  font-size: 1rem;
  font-weight: 800;
}

.progression-compass__meta,
.progression-compass__keys,
.progression-compass__reason,
.progression-compass__empty {
  color: var(--color-muted);
  font-size: 0.86rem;
}

.progression-compass__keys {
  color: var(--color-text);
  font-weight: 750;
}
```

Inside `@media (min-width: 768px)`, add:

```css
  .progression-compass__suggestions {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
```

Inside `@media (max-width: 767px)`, add:

```css
  .progression-compass__suggestions {
    display: flex;
    overflow-x: auto;
    padding-bottom: 0.25rem;
    scroll-snap-type: x proximity;
  }

  .progression-compass__card {
    flex: 0 0 min(17rem, 82vw);
    scroll-snap-align: start;
  }
```

- [ ] **Step 5: Run component tests**

Run:

```sh
npm test -- src/components/__tests__/ProgressionCompass.test.tsx
```

Expected: pass.

- [ ] **Step 6: Commit component**

Run:

```sh
git add src/components/ProgressionCompass.tsx src/components/__tests__/ProgressionCompass.test.tsx src/styles.css
git commit -m "feat: add progression compass component"
```

## Task 5: App Controls and Starter Integration

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Modify: `src/components/__tests__/App.test.tsx`

- [ ] **Step 1: Add failing app tests for controls and starters**

Append to `src/components/__tests__/App.test.tsx`:

```tsx
  it("shows genre and key controls with starter suggestions", () => {
    render(<App />);

    expect(screen.getByLabelText("Progression genre")).toHaveValue("pop");
    expect(screen.getByLabelText("Progression key")).toHaveValue("C");
    expect(screen.getByLabelText("Key mode")).toHaveValue("major");
    expect(screen.getByRole("region", { name: "Progression compass" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I (C)" })).toBeInTheDocument();
  });

  it("updates starter ideas when key and mode change", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Progression key"), {
      target: { value: "D" },
    });
    fireEvent.change(screen.getByLabelText("Key mode"), {
      target: { value: "minor" },
    });

    expect(screen.getByRole("button", { name: "i (Dm)" })).toBeInTheDocument();
  });

  it("uses a selected starter as the current compass node", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "I (C)" }));

    expect(screen.getByText("You are here")).toBeInTheDocument();
    expect(screen.getAllByText("I (C)").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "vi (Am)" })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run app tests to verify they fail**

Run:

```sh
npm test -- src/components/__tests__/App.test.tsx -t "starter"
```

Expected: fail because the controls and compass component are not integrated in `App.tsx`.

- [ ] **Step 3: Integrate controls and starter compass**

In `src/App.tsx`, add imports:

```ts
import { ProgressionCompass } from "./components/ProgressionCompass";
import {
  buildCompassNodeView,
  buildProgressionSuggestions,
  getStarterSuggestions,
} from "./music/progressionCompass";
import type {
  CompassNodeView,
  KeyMode,
  ProgressionGenre,
  ProgressionSuggestion,
} from "./music/types";
```

Add constants near `MOBILE_RANGE_QUERY`:

```ts
const KEY_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const GENRE_OPTIONS: ProgressionGenre[] = [
  "pop",
  "jazz",
  "blues",
  "classical",
  "gospel",
  "neo-soul",
];

function genreLabel(genre: ProgressionGenre): string {
  return genre
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}
```

Add state inside `App` after existing `progression` state:

```ts
  const [progressionGenre, setProgressionGenre] =
    useState<ProgressionGenre>("pop");
  const [progressionKey, setProgressionKey] = useState("C");
  const [keyMode, setKeyMode] = useState<KeyMode>("major");
  const [currentCompassNode, setCurrentCompassNode] =
    useState<CompassNodeView | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] =
    useState<string | null>(null);
  const [matchedSuggestionId, setMatchedSuggestionId] = useState<string | null>(
    null,
  );
```

Add derived suggestions after `detection`:

```ts
  const compassSuggestions = useMemo<ProgressionSuggestion[]>(() => {
    if (!currentCompassNode) {
      return getStarterSuggestions(progressionGenre, keyMode, progressionKey);
    }

    return buildProgressionSuggestions(
      progressionGenre,
      keyMode,
      progressionKey,
      currentCompassNode.nodeId,
    );
  }, [currentCompassNode, keyMode, progressionGenre, progressionKey]);

  const selectedSuggestion =
    compassSuggestions.find((suggestion) => suggestion.id === selectedSuggestionId) ??
    compassSuggestions[0] ??
    null;

  const handleCompassSuggestionSelect = useCallback(
    (suggestionId: string) => {
      setSelectedSuggestionId(suggestionId);

      const suggestion = compassSuggestions.find(
        (candidate) => candidate.id === suggestionId,
      );

      if (!currentCompassNode && suggestion) {
        setCurrentCompassNode(
          buildCompassNodeView(
            progressionGenre,
            keyMode,
            progressionKey,
            suggestion.nodeId,
          ),
        );
      }
    },
    [
      compassSuggestions,
      currentCompassNode,
      keyMode,
      progressionGenre,
      progressionKey,
    ],
  );
```

Add an effect to reset selected suggestion when the list changes:

```ts
  useEffect(() => {
    setSelectedSuggestionId(compassSuggestions[0]?.id ?? null);
    setMatchedSuggestionId(null);
  }, [compassSuggestions]);
```

Add an effect to clear compass node when controls change:

```ts
  useEffect(() => {
    setCurrentCompassNode(null);
  }, [keyMode, progressionGenre, progressionKey]);
```

In the JSX, insert controls before `ChordReadout`:

```tsx
          <section className="progression-controls" aria-label="Progression settings">
            <label className="progression-controls__field">
              <span>Genre</span>
              <select
                aria-label="Progression genre"
                value={progressionGenre}
                onChange={(event) =>
                  setProgressionGenre(event.target.value as ProgressionGenre)
                }
              >
                {GENRE_OPTIONS.map((genre) => (
                  <option key={genre} value={genre}>
                    {genreLabel(genre)}
                  </option>
                ))}
              </select>
            </label>
            <label className="progression-controls__field">
              <span>Key</span>
              <select
                aria-label="Progression key"
                value={progressionKey}
                onChange={(event) => setProgressionKey(event.target.value)}
              >
                {KEY_ROOTS.map((keyRoot) => (
                  <option key={keyRoot} value={keyRoot}>
                    {keyRoot}
                  </option>
                ))}
              </select>
            </label>
            <label className="progression-controls__field">
              <span>Mode</span>
              <select
                aria-label="Key mode"
                value={keyMode}
                onChange={(event) => setKeyMode(event.target.value as KeyMode)}
              >
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </label>
          </section>
```

Insert compass between `ChordReadout` and `ProgressionTrail`:

```tsx
          <ProgressionCompass
            currentNode={currentCompassNode}
            matchedSuggestionId={matchedSuggestionId}
            onSuggestionSelect={handleCompassSuggestionSelect}
            selectedSuggestionId={selectedSuggestion?.id ?? null}
            suggestions={compassSuggestions}
          />
```

Pass hints to `PianoKeyboard`:

```tsx
          hintedMidiNumbers={selectedSuggestion?.target.midiNumbers ?? []}
```

- [ ] **Step 4: Add control styles**

In `src/styles.css`, add:

```css
.progression-controls {
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}

.progression-controls__field {
  display: grid;
  flex: 1 1 8rem;
  gap: 0.25rem;
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
}

.progression-controls__field select {
  min-height: 2.5rem;
  border: 1px solid rgba(243, 245, 241, 0.13);
  border-radius: 0.5rem;
  padding: 0 0.75rem;
  background: rgba(243, 245, 241, 0.06);
  color: var(--color-text);
  font: inherit;
  text-transform: none;
}
```

In the `@media (min-width: 768px)` block, replace the current
`.app-workspace__readout` grid rule with a single-column stack:

```css
  .app-workspace__readout {
    grid-template-columns: minmax(0, 1fr);
  }
```

- [ ] **Step 5: Run app starter tests**

Run:

```sh
npm test -- src/components/__tests__/App.test.tsx -t "starter"
```

Expected: pass.

- [ ] **Step 6: Run affected component tests**

Run:

```sh
npm test -- src/components/__tests__/App.test.tsx src/components/__tests__/PianoKeyboard.test.tsx src/components/__tests__/ProgressionCompass.test.tsx
```

Expected: pass.

- [ ] **Step 7: Commit starter integration**

Run:

```sh
git add src/App.tsx src/styles.css src/components/__tests__/App.test.tsx
git commit -m "feat: show progression compass starters"
```

## Task 6: Matching, Confirmation, and Advancement

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/__tests__/App.test.tsx`

- [ ] **Step 1: Add failing matching workflow tests**

Append to `src/components/__tests__/App.test.tsx`:

```tsx
  it("selects a suggested target, confirms a matching inversion, and advances", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
        pointerId: 1,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 2,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
        pointerId: 3,
      });

      expect(screen.getByText("You are here")).toBeInTheDocument();
      expect(screen.getAllByText("I (C)").length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole("button", { name: "vi (Am)" }));

      fireEvent.pointerUp(screen.getByRole("button", { name: "C4" }), {
        pointerId: 1,
      });
      fireEvent.pointerUp(screen.getByRole("button", { name: "E4" }), {
        pointerId: 2,
      });
      fireEvent.pointerUp(screen.getByRole("button", { name: "G4" }), {
        pointerId: 3,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 4,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "A4" }), {
        pointerId: 5,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "C5" }), {
        pointerId: 6,
      });

      expect(screen.getByRole("button", { name: "vi (Am)" })).toHaveAttribute(
        "data-matched",
        "true",
      );

      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.getAllByText("vi (Am)").length).toBeGreaterThan(0);
      expect(screen.queryByRole("button", { name: "vi (Am)" })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not add selected suggestions to the recent progression before they are played", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "vi (Am)" }));

    expect(
      within(screen.getByRole("region", { name: "Recent progression" })).queryByText("Am"),
    ).not.toBeInTheDocument();
  });
```

Ensure the existing import includes `within` and `act` already does:

```ts
import { act, fireEvent, render, screen, within } from "@testing-library/react";
```

- [ ] **Step 2: Run matching tests to verify they fail**

Run:

```sh
npm test -- src/components/__tests__/App.test.tsx -t "suggested target"
```

Expected: fail because the compass does not advance from played chords yet.

- [ ] **Step 3: Add active-node detection and match effects**

In `src/App.tsx`, update imports:

```ts
import {
  buildCompassNodeView,
  buildProgressionSuggestions,
  buildTargetVoicingForNode,
  doesPitchClassSetMatchTarget,
  findMatchingSuggestion,
  getStarterSuggestions,
} from "./music/progressionCompass";
import { getProgressionGraph } from "./music/progressionGraph";
```

Add helper near `genreLabel`:

```ts
const MATCH_CONFIRMATION_MS = 600;

function findNodeIdForPitchClasses(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  pitchClasses: string[],
): string | null {
  if (pitchClasses.length === 0) {
    return null;
  }

  const graph = getProgressionGraph(genre, mode);

  return (
    graph.nodes.find((node) => {
      const target = buildTargetVoicingForNode(genre, mode, keyRoot, node.id);
      return doesPitchClassSetMatchTarget(pitchClasses, target.pitchClasses);
    })?.id ?? null
  );
}
```

Add an effect after the existing progression-trail effect:

```ts
  useEffect(() => {
    if (currentCompassNode) {
      return;
    }

    const nodeId = findNodeIdForPitchClasses(
      progressionGenre,
      keyMode,
      progressionKey,
      detection.pitchClasses,
    );

    if (!nodeId) {
      return;
    }

    setCurrentCompassNode((current) => {
      if (current?.nodeId === nodeId) {
        return current;
      }

      return buildCompassNodeView(progressionGenre, keyMode, progressionKey, nodeId);
    });
  }, [
    currentCompassNode,
    detection.pitchClasses,
    keyMode,
    progressionGenre,
    progressionKey,
  ]);
```

Add match-and-advance effect after `selectedSuggestion`:

```ts
  useEffect(() => {
    if (compassSuggestions.length === 0 || detection.pitchClasses.length === 0) {
      return;
    }

    const matchedSuggestion = findMatchingSuggestion(
      compassSuggestions,
      detection.pitchClasses,
    );

    if (!matchedSuggestion || matchedSuggestion.id === matchedSuggestionId) {
      return;
    }

    setMatchedSuggestionId(matchedSuggestion.id);

    const timeoutId = window.setTimeout(() => {
      setCurrentCompassNode(
        buildCompassNodeView(
          progressionGenre,
          keyMode,
          progressionKey,
          matchedSuggestion.nodeId,
        ),
      );
      setMatchedSuggestionId(null);
    }, MATCH_CONFIRMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    compassSuggestions,
    detection.pitchClasses,
    keyMode,
    progressionGenre,
    progressionKey,
  ]);
```

- [ ] **Step 4: Run matching tests**

Run:

```sh
npm test -- src/components/__tests__/App.test.tsx -t "suggested target"
```

Expected: pass.

- [ ] **Step 5: Run full app component tests**

Run:

```sh
npm test -- src/components/__tests__/App.test.tsx
```

Expected: pass.

- [ ] **Step 6: Commit matching behavior**

Run:

```sh
git add src/App.tsx src/components/__tests__/App.test.tsx
git commit -m "feat: advance progression compass from played chords"
```

## Task 7: Final Polish and Verification

**Files:**
- Modify: `src/styles.css`
- Modify: tests only if final verification reveals a deterministic issue

- [ ] **Step 1: Run full verification**

Run:

```sh
make verify
```

Expected: tests, TypeScript lint, and production build pass.

- [ ] **Step 2: Start local dev server**

Run:

```sh
make dev
```

Expected: Vite prints a local URL such as `http://localhost:5173/`. Keep this session running for browser verification.

- [ ] **Step 3: Manual browser verification**

Open the Vite URL and verify these flows:

- Default pop C major shows starter cards and target key hints.
- Selecting `vi (Am)` changes highlighted target keys to A, C, and E.
- Playing C major shows `You are here` for `I (C)` and next move cards.
- Playing an Am inversion confirms `vi (Am)` and advances after a brief pause.
- Recent progression contains only chords played on the keyboard.
- Switching genre or key resets to starter ideas.
- Mobile width keeps cards scrollable and the piano usable.

- [ ] **Step 4: Stop dev server**

Stop the Vite process with `Ctrl-C`.

- [ ] **Step 5: Commit polish if needed**

If Step 3 required CSS or test fixes, commit them:

```sh
git add src/styles.css src/components/__tests__/App.test.tsx src/components/__tests__/ProgressionCompass.test.tsx
git commit -m "fix: polish progression compass layout"
```

If no changes were needed, do not create an empty commit.

- [ ] **Step 6: Final status check**

Run:

```sh
git status --short
```

Expected: no unstaged or staged changes except ignored `.superpowers/` companion files.

## Self-Review Notes

- Spec coverage: genre/key controls, major/minor modes, curated graph, richer chord qualities, Roman numerals plus concrete names, key hints, flexible inversion matching, confirmation/advance behavior, recent-trail boundary, empty states, and tests are each covered by tasks above.
- Scope check: the plan builds one testable subsystem inside the existing single-screen app. Key inference, persistence, recipes, and filters remain future work.
- Type consistency: `ProgressionGenre`, `KeyMode`, `ProgressionGraphNode`, `ProgressionSuggestion`, `CompassNodeView`, and `TargetVoicing` are defined in Task 1 and reused consistently by later tasks.
