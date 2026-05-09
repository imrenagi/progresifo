# Progresifo Piano Chord Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Progresifo web app: a dark-themed piano learning surface that shows pressed notes, chord names, alternate chord names, recent progression history, optional Tone.js sound, and USB MIDI input.

**Architecture:** Use a Vite React TypeScript app with small, testable domain helpers for note state, chord detection, MIDI parsing, and progression tracking. Keep browser APIs behind hooks: native Web MIDI for controller input and Tone.js for optional audio playback.

**Tech Stack:** React 19.2.6, Vite 8.0.11, TypeScript 6.0.3, Tailwind CSS 4.3.0, `@tailwindcss/vite` 4.3.0, Tonal 6.4.3, Tone.js 15.1.22, Vitest 4.1.5, Testing Library, lucide-react 1.14.0.

---

## File Structure

- Create `package.json`: scripts, dependencies, and dev dependencies.
- Create `index.html`: Vite HTML entry.
- Create `vite.config.ts`: React, Tailwind v4, and Vitest jsdom config.
- Create `tsconfig.json`: TypeScript strict project config.
- Create `src/main.tsx`: React root.
- Create `src/App.tsx`: app composition and shared state orchestration.
- Create `src/styles.css`: Tailwind v4 import, theme tokens, and custom piano layout styles.
- Create `src/types/web-midi.d.ts`: minimal native Web MIDI type declarations.
- Create `src/music/types.ts`: shared note/chord/progression types.
- Create `src/music/notes.ts`: MIDI-to-note helpers and piano range generation.
- Create `src/music/activeNotes.ts`: source-aware active-note state helpers.
- Create `src/music/chords.ts`: Tonal chord candidate detection.
- Create `src/music/progression.ts`: bounded recent chord progression helpers.
- Create `src/music/__tests__/*.test.ts`: unit tests for music helpers.
- Create `src/midi/parseMidiMessage.ts`: pure MIDI byte parsing.
- Create `src/midi/useMidiInput.ts`: native Web MIDI hook.
- Create `src/midi/__tests__/parseMidiMessage.test.ts`: MIDI parser tests.
- Create `src/audio/useToneSynth.ts`: optional Tone.js playback hook.
- Create `src/components/PianoKeyboard.tsx`: responsive piano UI.
- Create `src/components/ChordReadout.tsx`: primary chord, alternate names, and pressed notes.
- Create `src/components/ProgressionTrail.tsx`: recent chord list.
- Create `src/components/StatusBar.tsx`: MIDI and sound controls.
- Create `src/components/__tests__/*.test.tsx`: focused UI tests.
- Create `src/test/setup.ts`: Testing Library matchers.

The implementation plan chooses native Web MIDI rather than the `webmidi`
wrapper for v1 because the app only needs input enumeration and note-on/off
events. The hook boundary keeps the option open to swap in `webmidi` later.

---

### Task 1: Scaffold Vite React TypeScript App

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `src/main.tsx`
- Create: `src/App.tsx`
- Create: `src/styles.css`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Add project manifest**

Create `package.json` with exact versions verified on 2026-05-09:

```json
{
  "name": "progresifo",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host 0.0.0.0",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 0.0.0.0",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "@tailwindcss/vite": "4.3.0",
    "lucide-react": "1.14.0",
    "react": "19.2.6",
    "react-dom": "19.2.6",
    "tonal": "6.4.3",
    "tone": "15.1.22"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "6.9.1",
    "@testing-library/react": "16.3.2",
    "@testing-library/user-event": "14.6.1",
    "@types/react": "19.2.14",
    "@types/react-dom": "19.2.3",
    "@vitejs/plugin-react": "6.0.1",
    "jsdom": "29.1.1",
    "tailwindcss": "4.3.0",
    "typescript": "6.0.3",
    "vite": "8.0.11",
    "vitest": "4.1.5"
  }
}
```

- [ ] **Step 2: Add Vite entry HTML**

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta
      name="description"
      content="Progresifo helps you learn piano chords and chord progressions."
    />
    <title>Progresifo</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Add TypeScript config**

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "forceConsistentCasingInFileNames": true,
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "types": ["vitest/globals"]
  },
  "include": ["src", "vite.config.ts"]
}
```

- [ ] **Step 4: Add Vite config**

Create `vite.config.ts`:

```ts
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
  },
});
```

- [ ] **Step 5: Add React entry**

Create `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 6: Add temporary app shell**

Create `src/App.tsx`:

```tsx
export default function App() {
  return (
    <main className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
      <h1 className="p-6 text-2xl font-semibold">Progresifo</h1>
    </main>
  );
}
```

- [ ] **Step 7: Add Tailwind v4 CSS entry and test setup**

Create `src/styles.css`:

```css
@import "tailwindcss";

@theme {
  --font-sans: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    "Segoe UI", sans-serif;
}

:root {
  --color-bg: #101214;
  --color-panel: #181c20;
  --color-panel-soft: #20262b;
  --color-text: #f3f5f1;
  --color-muted: #a7b0aa;
  --color-key-white: #f4efe4;
  --color-key-white-pressed: #8ee8dc;
  --color-key-black: #17191c;
  --color-key-black-pressed: #12b8aa;
  --color-accent: #f2b84b;
  --color-error: #d46666;
}

body {
  margin: 0;
  min-width: 320px;
  background: var(--color-bg);
  font-family: var(--font-sans);
}

button {
  font: inherit;
}
```

Create `src/test/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 8: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and npm exits with code 0.

- [ ] **Step 9: Verify scaffold**

Run:

```bash
npm run build
```

Expected: build passes. Do not run `npm test` in this task because no test files exist yet.

- [ ] **Step 10: Commit scaffold**

Run:

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig.json src/main.tsx src/App.tsx src/styles.css src/test/setup.ts
git commit -m "build: scaffold react vite piano app"
```

---

### Task 2: Add Music Domain Helpers With Unit Tests

**Files:**
- Create: `src/music/types.ts`
- Create: `src/music/notes.ts`
- Create: `src/music/activeNotes.ts`
- Create: `src/music/chords.ts`
- Create: `src/music/progression.ts`
- Create: `src/music/__tests__/notes.test.ts`
- Create: `src/music/__tests__/activeNotes.test.ts`
- Create: `src/music/__tests__/chords.test.ts`
- Create: `src/music/__tests__/progression.test.ts`

- [ ] **Step 1: Write note helper tests**

Create `src/music/__tests__/notes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  FULL_PIANO_RANGE,
  MOBILE_PIANO_RANGE,
  buildPianoKeys,
  isBlackKey,
  midiToNoteName,
  noteNameToPitchClass,
} from "../notes";

describe("notes", () => {
  it("converts MIDI numbers to sharp note names", () => {
    expect(midiToNoteName(60)).toBe("C4");
    expect(midiToNoteName(61)).toBe("C#4");
    expect(midiToNoteName(108)).toBe("C8");
  });

  it("extracts pitch classes", () => {
    expect(noteNameToPitchClass("C#4")).toBe("C#");
    expect(noteNameToPitchClass("Bb3")).toBe("Bb");
  });

  it("builds the full 88-key piano range", () => {
    const keys = buildPianoKeys(FULL_PIANO_RANGE);
    expect(keys).toHaveLength(88);
    expect(keys[0]).toMatchObject({ midi: 21, name: "A0" });
    expect(keys.at(-1)).toMatchObject({ midi: 108, name: "C8" });
  });

  it("builds a playable two-octave mobile range with middle C", () => {
    const keys = buildPianoKeys(MOBILE_PIANO_RANGE);
    expect(keys).toHaveLength(24);
    expect(keys.some((key) => key.name === "C4")).toBe(true);
  });

  it("identifies black keys", () => {
    expect(isBlackKey("C#4")).toBe(true);
    expect(isBlackKey("C4")).toBe(false);
  });
});
```

- [ ] **Step 2: Run note tests and confirm failure**

Run:

```bash
npm test -- src/music/__tests__/notes.test.ts
```

Expected: FAIL because `src/music/notes.ts` does not exist.

- [ ] **Step 3: Implement note helpers and shared types**

Create `src/music/types.ts`:

```ts
export type ActiveNoteSource = "pointer" | "midi";

export type ActiveNote = {
  id: string;
  midi: number;
  name: string;
  pitchClass: string;
  source: ActiveNoteSource;
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
```

Create `src/music/notes.ts`:

```ts
import { Note } from "tonal";
import type { PianoKey, PianoRange } from "./types";

export const FULL_PIANO_RANGE: PianoRange = { start: 21, end: 108 };
export const MOBILE_PIANO_RANGE: PianoRange = { start: 48, end: 71 };

const BLACK_KEY_PITCH_CLASSES = new Set(["C#", "D#", "F#", "G#", "A#"]);

export function midiToNoteName(midi: number): string {
  const noteName = Note.fromMidiSharps(midi);

  if (!noteName) {
    throw new Error(`Unable to convert MIDI note ${midi} to a note name.`);
  }

  return noteName;
}

export function noteNameToPitchClass(noteName: string): string {
  const pitchClass = Note.get(noteName).pc;

  if (!pitchClass) {
    throw new Error(`Unable to read pitch class from note ${noteName}.`);
  }

  return pitchClass;
}

export function isBlackKey(noteName: string): boolean {
  return BLACK_KEY_PITCH_CLASSES.has(noteNameToPitchClass(noteName));
}

export function buildPianoKeys(range: PianoRange): PianoKey[] {
  return Array.from({ length: range.end - range.start + 1 }, (_, index) => {
    const midi = range.start + index;
    const name = midiToNoteName(midi);

    return {
      midi,
      name,
      pitchClass: noteNameToPitchClass(name),
      isBlack: isBlackKey(name),
    };
  });
}
```

- [ ] **Step 4: Run note tests and confirm pass**

Run:

```bash
npm test -- src/music/__tests__/notes.test.ts
```

Expected: PASS.

- [ ] **Step 5: Write active-note tests**

Create `src/music/__tests__/activeNotes.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  addActiveNote,
  getDisplayNotes,
  getUniqueMidiNumbers,
  removeActiveNote,
} from "../activeNotes";

describe("activeNotes", () => {
  it("adds and removes source-aware notes", () => {
    const pointer = addActiveNote([], {
      midi: 60,
      source: "pointer",
      startedAt: 10,
    });
    const bothSources = addActiveNote(pointer, {
      midi: 60,
      source: "midi",
      velocity: 96,
      startedAt: 11,
    });

    expect(bothSources).toHaveLength(2);
    expect(removeActiveNote(bothSources, 60, "pointer")).toHaveLength(1);
    expect(removeActiveNote(bothSources, 60, "midi")).toHaveLength(1);
  });

  it("updates repeated notes from the same source instead of duplicating", () => {
    const first = addActiveNote([], {
      midi: 64,
      source: "midi",
      velocity: 80,
      startedAt: 20,
    });
    const second = addActiveNote(first, {
      midi: 64,
      source: "midi",
      velocity: 100,
      startedAt: 25,
    });

    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ velocity: 100, startedAt: 25 });
  });

  it("deduplicates MIDI numbers and display names", () => {
    const active = [
      ...addActiveNote([], { midi: 60, source: "pointer", startedAt: 1 }),
      ...addActiveNote([], { midi: 60, source: "midi", startedAt: 2 }),
      ...addActiveNote([], { midi: 64, source: "midi", startedAt: 3 }),
    ];

    expect(getUniqueMidiNumbers(active)).toEqual([60, 64]);
    expect(getDisplayNotes(active)).toEqual(["C4", "E4"]);
  });
});
```

- [ ] **Step 6: Run active-note tests and confirm failure**

Run:

```bash
npm test -- src/music/__tests__/activeNotes.test.ts
```

Expected: FAIL because `src/music/activeNotes.ts` does not exist.

- [ ] **Step 7: Implement active-note helpers**

Create `src/music/activeNotes.ts`:

```ts
import { midiToNoteName, noteNameToPitchClass } from "./notes";
import type { ActiveNote, ActiveNoteSource } from "./types";

type AddActiveNoteInput = {
  midi: number;
  source: ActiveNoteSource;
  velocity?: number;
  startedAt: number;
};

function activeNoteId(midi: number, source: ActiveNoteSource): string {
  return `${source}:${midi}`;
}

export function addActiveNote(
  activeNotes: ActiveNote[],
  input: AddActiveNoteInput,
): ActiveNote[] {
  const name = midiToNoteName(input.midi);
  const nextNote: ActiveNote = {
    id: activeNoteId(input.midi, input.source),
    midi: input.midi,
    name,
    pitchClass: noteNameToPitchClass(name),
    source: input.source,
    velocity: input.velocity,
    startedAt: input.startedAt,
  };

  const withoutExisting = activeNotes.filter((note) => note.id !== nextNote.id);
  return [...withoutExisting, nextNote].sort((a, b) => a.midi - b.midi);
}

export function removeActiveNote(
  activeNotes: ActiveNote[],
  midi: number,
  source: ActiveNoteSource,
): ActiveNote[] {
  const id = activeNoteId(midi, source);
  return activeNotes.filter((note) => note.id !== id);
}

export function removeAllNotesForSource(
  activeNotes: ActiveNote[],
  source: ActiveNoteSource,
): ActiveNote[] {
  return activeNotes.filter((note) => note.source !== source);
}

export function getUniqueMidiNumbers(activeNotes: ActiveNote[]): number[] {
  return Array.from(new Set(activeNotes.map((note) => note.midi))).sort(
    (a, b) => a - b,
  );
}

export function getDisplayNotes(activeNotes: ActiveNote[]): string[] {
  const byMidi = new Map<number, string>();

  activeNotes.forEach((note) => {
    byMidi.set(note.midi, note.name);
  });

  return Array.from(byMidi.entries())
    .sort(([a], [b]) => a - b)
    .map(([, name]) => name);
}
```

- [ ] **Step 8: Run active-note tests and confirm pass**

Run:

```bash
npm test -- src/music/__tests__/activeNotes.test.ts
```

Expected: PASS.

- [ ] **Step 9: Write chord tests**

Create `src/music/__tests__/chords.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { detectChord } from "../chords";
import { addActiveNote } from "../activeNotes";
import type { ActiveNote } from "../types";

describe("chords", () => {
  it("returns no chord for fewer than three pitch classes", () => {
    const active = [
      ...addActiveNote([], { midi: 60, source: "pointer", startedAt: 1 }),
      ...addActiveNote([], { midi: 64, source: "pointer", startedAt: 2 }),
    ];

    expect(detectChord(active)).toMatchObject({
      primary: null,
      alternatives: [],
      candidates: [],
      pitchClasses: ["C", "E"],
    });
  });

  it("detects a major triad", () => {
    const active = [60, 64, 67].reduce<ActiveNote[]>(
      (notes, midi, index) =>
        addActiveNote(notes, { midi, source: "pointer", startedAt: index }),
      [],
    );

    expect(detectChord(active).primary).toBe("C");
  });

  it("keeps alternate chord names visible", () => {
    const active = [64, 68, 71, 73].reduce<ActiveNote[]>(
      (notes, midi, index) =>
        addActiveNote(notes, { midi, source: "midi", startedAt: index }),
      [],
    );

    const detection = detectChord(active);

    expect(detection.primary).toBeTruthy();
    expect(detection.candidates.length).toBeGreaterThanOrEqual(1);
    expect(detection.alternatives).toEqual(detection.candidates.slice(1));
  });
});
```

- [ ] **Step 10: Run chord tests and confirm failure**

Run:

```bash
npm test -- src/music/__tests__/chords.test.ts
```

Expected: FAIL because `src/music/chords.ts` does not exist.

- [ ] **Step 11: Implement chord detection**

Create `src/music/chords.ts`:

```ts
import { Chord } from "tonal";
import type { ActiveNote, ChordDetection } from "./types";

function getPitchClasses(activeNotes: ActiveNote[]): string[] {
  return Array.from(new Set(activeNotes.map((note) => note.pitchClass))).sort();
}

export function detectChord(activeNotes: ActiveNote[]): ChordDetection {
  const pitchClasses = getPitchClasses(activeNotes);

  if (pitchClasses.length < 3) {
    return {
      primary: null,
      alternatives: [],
      candidates: [],
      pitchClasses,
    };
  }

  const candidates = Chord.detect(pitchClasses);

  return {
    primary: candidates[0] ?? null,
    alternatives: candidates.slice(1),
    candidates,
    pitchClasses,
  };
}
```

- [ ] **Step 12: Run chord tests and confirm pass**

Run:

```bash
npm test -- src/music/__tests__/chords.test.ts
```

Expected: PASS.

- [ ] **Step 13: Write progression tests**

Create `src/music/__tests__/progression.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { addChordToProgression } from "../progression";
import type { ProgressionEntry } from "../progression";

describe("progression", () => {
  it("records non-empty chord changes", () => {
    const first = addChordToProgression([], "C", 100);
    const repeated = addChordToProgression(first, "C", 110);
    const next = addChordToProgression(repeated, "G", 120);

    expect(repeated).toHaveLength(1);
    expect(next.map((entry) => entry.name)).toEqual(["C", "G"]);
  });

  it("ignores empty chord names", () => {
    expect(addChordToProgression([], null, 100)).toEqual([]);
  });

  it("keeps the latest eight chords", () => {
    const names = ["C", "Dm", "Em", "F", "G", "Am", "Bdim", "Cmaj7", "G7"];
    const trail = names.reduce<ProgressionEntry[]>(
      (entries, name, index) => addChordToProgression(entries, name, index),
      [],
    );

    expect(trail).toHaveLength(8);
    expect(trail[0].name).toBe("Dm");
    expect(trail.at(-1)?.name).toBe("G7");
  });
});
```

- [ ] **Step 14: Run progression tests and confirm failure**

Run:

```bash
npm test -- src/music/__tests__/progression.test.ts
```

Expected: FAIL because `src/music/progression.ts` does not exist.

- [ ] **Step 15: Implement progression helper**

Create `src/music/progression.ts`:

```ts
export type ProgressionEntry = {
  id: string;
  name: string;
  detectedAt: number;
};

const MAX_PROGRESSION_LENGTH = 8;

export function addChordToProgression(
  entries: ProgressionEntry[],
  chordName: string | null,
  detectedAt: number,
): ProgressionEntry[] {
  if (!chordName) {
    return entries;
  }

  if (entries.at(-1)?.name === chordName) {
    return entries;
  }

  const nextEntry: ProgressionEntry = {
    id: `${chordName}-${detectedAt}`,
    name: chordName,
    detectedAt,
  };

  return [...entries, nextEntry].slice(-MAX_PROGRESSION_LENGTH);
}
```

- [ ] **Step 16: Run all music tests**

Run:

```bash
npm test -- src/music
```

Expected: PASS.

- [ ] **Step 17: Commit music domain helpers**

Run:

```bash
git add src/music
git commit -m "feat: add music theory domain helpers"
```

---

### Task 3: Add Native Web MIDI Parsing and Hook

**Files:**
- Create: `src/types/web-midi.d.ts`
- Create: `src/midi/parseMidiMessage.ts`
- Create: `src/midi/useMidiInput.ts`
- Create: `src/midi/__tests__/parseMidiMessage.test.ts`

- [ ] **Step 1: Write MIDI parser tests**

Create `src/midi/__tests__/parseMidiMessage.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseMidiMessage } from "../parseMidiMessage";

describe("parseMidiMessage", () => {
  it("parses note-on messages", () => {
    expect(parseMidiMessage([0x90, 60, 100])).toEqual({
      type: "note-on",
      midi: 60,
      velocity: 100,
    });
  });

  it("treats note-on with velocity zero as note-off", () => {
    expect(parseMidiMessage([0x90, 60, 0])).toEqual({
      type: "note-off",
      midi: 60,
      velocity: 0,
    });
  });

  it("parses note-off messages", () => {
    expect(parseMidiMessage([0x80, 60, 64])).toEqual({
      type: "note-off",
      midi: 60,
      velocity: 64,
    });
  });

  it("ignores non-note messages", () => {
    expect(parseMidiMessage([0xb0, 1, 127])).toEqual({ type: "ignored" });
  });
});
```

- [ ] **Step 2: Run MIDI parser tests and confirm failure**

Run:

```bash
npm test -- src/midi/__tests__/parseMidiMessage.test.ts
```

Expected: FAIL because `src/midi/parseMidiMessage.ts` does not exist.

- [ ] **Step 3: Implement MIDI parser**

Create `src/midi/parseMidiMessage.ts`:

```ts
export type ParsedMidiMessage =
  | { type: "note-on"; midi: number; velocity: number }
  | { type: "note-off"; midi: number; velocity: number }
  | { type: "ignored" };

export function parseMidiMessage(data: ArrayLike<number>): ParsedMidiMessage {
  const status = data[0] ?? 0;
  const command = status & 0xf0;
  const midi = data[1] ?? 0;
  const velocity = data[2] ?? 0;

  if (command === 0x90) {
    return velocity > 0
      ? { type: "note-on", midi, velocity }
      : { type: "note-off", midi, velocity };
  }

  if (command === 0x80) {
    return { type: "note-off", midi, velocity };
  }

  return { type: "ignored" };
}
```

- [ ] **Step 4: Run MIDI parser tests and confirm pass**

Run:

```bash
npm test -- src/midi/__tests__/parseMidiMessage.test.ts
```

Expected: PASS.

- [ ] **Step 5: Add native Web MIDI types**

Create `src/types/web-midi.d.ts`:

```ts
type MIDIPortType = "input" | "output";
type MIDIPortDeviceState = "connected" | "disconnected";
type MIDIPortConnectionState = "open" | "closed" | "pending";

interface MIDIPort {
  readonly id: string;
  readonly manufacturer?: string;
  readonly name?: string;
  readonly type: MIDIPortType;
  readonly version?: string;
  readonly state: MIDIPortDeviceState;
  readonly connection: MIDIPortConnectionState;
  onstatechange: ((event: MIDIConnectionEvent) => void) | null;
  open(): Promise<MIDIPort>;
  close(): Promise<MIDIPort>;
}

interface MIDIInput extends MIDIPort {
  readonly type: "input";
  onmidimessage: ((event: MIDIMessageEvent) => void) | null;
}

interface MIDIOutput extends MIDIPort {
  readonly type: "output";
  send(data: number[], timestamp?: number): void;
  clear(): void;
}

interface MIDIInputMap extends ReadonlyMap<string, MIDIInput> {}
interface MIDIOutputMap extends ReadonlyMap<string, MIDIOutput> {}

interface MIDIMessageEvent extends Event {
  readonly data: Uint8Array;
}

interface MIDIConnectionEvent extends Event {
  readonly port: MIDIPort;
}

interface MIDIAccess extends EventTarget {
  readonly inputs: MIDIInputMap;
  readonly outputs: MIDIOutputMap;
  onstatechange: ((event: MIDIConnectionEvent) => void) | null;
}

interface Navigator {
  requestMIDIAccess?: (options?: { sysex?: boolean }) => Promise<MIDIAccess>;
}
```

- [ ] **Step 6: Implement Web MIDI hook**

Create `src/midi/useMidiInput.ts`:

```ts
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { parseMidiMessage } from "./parseMidiMessage";

export type MidiStatus =
  | "unsupported"
  | "permission-needed"
  | "connected"
  | "disconnected"
  | "error";

export type MidiNoteEvent = {
  midi: number;
  velocity: number;
};

type UseMidiInputOptions = {
  onNoteOn: (event: MidiNoteEvent) => void;
  onNoteOff: (event: MidiNoteEvent) => void;
};

type MidiDeviceSummary = {
  id: string;
  name: string;
  manufacturer: string;
};

function summarizeInputs(access: MIDIAccess): MidiDeviceSummary[] {
  return Array.from(access.inputs.values()).map((input) => ({
    id: input.id,
    name: input.name ?? "Unnamed MIDI input",
    manufacturer: input.manufacturer ?? "Unknown manufacturer",
  }));
}

export function useMidiInput({ onNoteOn, onNoteOff }: UseMidiInputOptions) {
  const [status, setStatus] = useState<MidiStatus>(() =>
    typeof navigator.requestMIDIAccess === "function"
      ? "permission-needed"
      : "unsupported",
  );
  const [devices, setDevices] = useState<MidiDeviceSummary[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const accessRef = useRef<MIDIAccess | null>(null);

  const attachListeners = useCallback(
    (access: MIDIAccess) => {
      const inputs = Array.from(access.inputs.values());
      setDevices(summarizeInputs(access));
      setStatus(inputs.length > 0 ? "connected" : "disconnected");

      inputs.forEach((input) => {
        input.onmidimessage = (event) => {
          const parsed = parseMidiMessage(event.data);

          if (parsed.type === "note-on") {
            onNoteOn({ midi: parsed.midi, velocity: parsed.velocity });
          }

          if (parsed.type === "note-off") {
            onNoteOff({ midi: parsed.midi, velocity: parsed.velocity });
          }
        };
      });
    },
    [onNoteOff, onNoteOn],
  );

  const connect = useCallback(async () => {
    if (typeof navigator.requestMIDIAccess !== "function") {
      setStatus("unsupported");
      return;
    }

    try {
      setErrorMessage(null);
      const access = await navigator.requestMIDIAccess({ sysex: false });
      accessRef.current = access;
      attachListeners(access);
      access.onstatechange = () => attachListeners(access);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to access MIDI devices.",
      );
    }
  }, [attachListeners]);

  useEffect(() => {
    return () => {
      const access = accessRef.current;

      if (!access) {
        return;
      }

      access.onstatechange = null;
      Array.from(access.inputs.values()).forEach((input) => {
        input.onmidimessage = null;
      });
    };
  }, []);

  return useMemo(
    () => ({
      status,
      devices,
      errorMessage,
      connect,
    }),
    [connect, devices, errorMessage, status],
  );
}
```

- [ ] **Step 7: Run MIDI tests and typecheck**

Run:

```bash
npm test -- src/midi
npm run lint
```

Expected: PASS.

- [ ] **Step 8: Commit native MIDI support**

Run:

```bash
git add src/types src/midi
git commit -m "feat: add native web midi input hook"
```

---

### Task 4: Add Optional Tone.js Audio Hook

**Files:**
- Create: `src/audio/useToneSynth.ts`

- [ ] **Step 1: Implement Tone.js hook**

Create `src/audio/useToneSynth.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from "react";
import { midiToNoteName } from "../music/notes";

type ToneModule = typeof import("tone");
type PolySynth = InstanceType<ToneModule["PolySynth"]>;

export type AudioStatus = "off" | "starting" | "on" | "error";

export function useToneSynth() {
  const [status, setStatus] = useState<AudioStatus>("off");
  const toneRef = useRef<ToneModule | null>(null);
  const synthRef = useRef<PolySynth | null>(null);
  const soundingNotesRef = useRef(new Set<number>());

  const enable = useCallback(async () => {
    if (status === "on" || status === "starting") {
      return;
    }

    try {
      setStatus("starting");
      const tone = await import("tone");
      await tone.start();
      const synth = new tone.PolySynth(tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: {
          attack: 0.01,
          decay: 0.18,
          sustain: 0.45,
          release: 0.8,
        },
      }).toDestination();

      toneRef.current = tone;
      synthRef.current = synth;
      setStatus("on");
    } catch {
      setStatus("error");
    }
  }, [status]);

  const disable = useCallback(() => {
    synthRef.current?.releaseAll();
    soundingNotesRef.current.clear();
    setStatus("off");
  }, []);

  const triggerAttack = useCallback(
    (midi: number, velocity = 100) => {
      if (status !== "on" || soundingNotesRef.current.has(midi)) {
        return;
      }

      soundingNotesRef.current.add(midi);
      synthRef.current?.triggerAttack(midiToNoteName(midi), undefined, velocity / 127);
    },
    [status],
  );

  const triggerRelease = useCallback(
    (midi: number) => {
      if (status !== "on") {
        return;
      }

      soundingNotesRef.current.delete(midi);
      synthRef.current?.triggerRelease(midiToNoteName(midi));
    },
    [status],
  );

  useEffect(() => {
    return () => {
      synthRef.current?.dispose();
      synthRef.current = null;
      toneRef.current = null;
      soundingNotesRef.current.clear();
    };
  }, []);

  return {
    status,
    isEnabled: status === "on",
    enable,
    disable,
    triggerAttack,
    triggerRelease,
  };
}
```

- [ ] **Step 2: Typecheck audio hook**

Run:

```bash
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Commit audio hook**

Run:

```bash
git add src/audio/useToneSynth.ts
git commit -m "feat: add optional tone synth playback"
```

---

### Task 5: Build Piano and Readout Components

**Files:**
- Create: `src/components/PianoKeyboard.tsx`
- Create: `src/components/ChordReadout.tsx`
- Create: `src/components/ProgressionTrail.tsx`
- Create: `src/components/StatusBar.tsx`
- Create: `src/components/__tests__/ChordReadout.test.tsx`
- Create: `src/components/__tests__/PianoKeyboard.test.tsx`

- [ ] **Step 1: Write ChordReadout test**

Create `src/components/__tests__/ChordReadout.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChordReadout } from "../ChordReadout";

describe("ChordReadout", () => {
  it("shows no chord empty state", () => {
    render(
      <ChordReadout
        detection={{
          primary: null,
          alternatives: [],
          candidates: [],
          pitchClasses: [],
        }}
        displayNotes={[]}
      />,
    );

    expect(screen.getByText("No chord")).toBeInTheDocument();
    expect(screen.getByText("Press three or more notes")).toBeInTheDocument();
  });

  it("shows primary chord and alternate names", () => {
    render(
      <ChordReadout
        detection={{
          primary: "C6",
          alternatives: ["Am7/C"],
          candidates: ["C6", "Am7/C"],
          pitchClasses: ["A", "C", "E", "G"],
        }}
        displayNotes={["C4", "E4", "G4", "A4"]}
      />,
    );

    expect(screen.getByRole("heading", { name: "C6" })).toBeInTheDocument();
    expect(screen.getByText("Am7/C")).toBeInTheDocument();
    expect(screen.getByText("C4 E4 G4 A4")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run ChordReadout test and confirm failure**

Run:

```bash
npm test -- src/components/__tests__/ChordReadout.test.tsx
```

Expected: FAIL because `ChordReadout.tsx` does not exist.

- [ ] **Step 3: Implement ChordReadout**

Create `src/components/ChordReadout.tsx`:

```tsx
import type { ChordDetection } from "../music/types";

type ChordReadoutProps = {
  detection: ChordDetection;
  displayNotes: string[];
};

export function ChordReadout({ detection, displayNotes }: ChordReadoutProps) {
  const primary = detection.primary ?? "No chord";

  return (
    <section className="grid gap-4 rounded-lg border border-white/10 bg-[var(--color-panel)] p-5 shadow-2xl shadow-black/20 md:grid-cols-[1fr_220px]">
      <div className="min-w-0">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Current chord
        </p>
        <h2 className="mt-2 text-5xl font-semibold leading-none text-[var(--color-accent)] md:text-7xl">
          {primary}
        </h2>
        <p className="mt-4 min-h-6 text-lg text-[var(--color-text)]">
          {displayNotes.length > 0 ? displayNotes.join(" ") : "Press three or more notes"}
        </p>
        {detection.pitchClasses.length > 0 ? (
          <p className="mt-2 text-sm text-[var(--color-muted)]">
            Pitch classes: {detection.pitchClasses.join(" ")}
          </p>
        ) : null}
      </div>

      <aside className="rounded-md bg-black/20 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Alternate names
        </p>
        {detection.alternatives.length > 0 ? (
          <ul className="mt-3 grid gap-2">
            {detection.alternatives.map((candidate) => (
              <li
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-text)]"
                key={candidate}
              >
                {candidate}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-[var(--color-muted)]">No alternate names</p>
        )}
      </aside>
    </section>
  );
}
```

- [ ] **Step 4: Run ChordReadout test and confirm pass**

Run:

```bash
npm test -- src/components/__tests__/ChordReadout.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Write PianoKeyboard test**

Create `src/components/__tests__/PianoKeyboard.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MOBILE_PIANO_RANGE } from "../../music/notes";
import { PianoKeyboard } from "../PianoKeyboard";

describe("PianoKeyboard", () => {
  it("renders accessible piano keys", () => {
    render(
      <PianoKeyboard
        activeMidiNumbers={[60]}
        onNoteDown={vi.fn()}
        onNoteUp={vi.fn()}
        range={MOBILE_PIANO_RANGE}
      />,
    );

    expect(screen.getByRole("button", { name: "C4" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "C#4" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("fires pointer note events", () => {
    const onNoteDown = vi.fn();
    const onNoteUp = vi.fn();

    render(
      <PianoKeyboard
        activeMidiNumbers={[]}
        onNoteDown={onNoteDown}
        onNoteUp={onNoteUp}
        range={MOBILE_PIANO_RANGE}
      />,
    );

    const c4 = screen.getByRole("button", { name: "C4" });
    fireEvent.pointerDown(c4);
    fireEvent.pointerUp(c4);

    expect(onNoteDown).toHaveBeenCalledWith(60);
    expect(onNoteUp).toHaveBeenCalledWith(60);
  });
});
```

- [ ] **Step 6: Run PianoKeyboard test and confirm failure**

Run:

```bash
npm test -- src/components/__tests__/PianoKeyboard.test.tsx
```

Expected: FAIL because `PianoKeyboard.tsx` does not exist.

- [ ] **Step 7: Implement PianoKeyboard**

Create `src/components/PianoKeyboard.tsx`:

```tsx
import type { CSSProperties } from "react";
import { buildPianoKeys, isBlackKey, noteNameToPitchClass } from "../music/notes";
import type { PianoRange } from "../music/types";

type PianoKeyboardProps = {
  activeMidiNumbers: number[];
  range: PianoRange;
  onNoteDown: (midi: number) => void;
  onNoteUp: (midi: number) => void;
};

const BLACK_KEY_LEFT_OFFSET = 0.68;

function getWhiteKeyIndex(midi: number, range: PianoRange): number {
  let whiteKeys = 0;

  for (let current = range.start; current < midi; current += 1) {
    if (!isBlackKey(buildPianoKeys({ start: current, end: current })[0].name)) {
      whiteKeys += 1;
    }
  }

  return whiteKeys;
}

export function PianoKeyboard({
  activeMidiNumbers,
  range,
  onNoteDown,
  onNoteUp,
}: PianoKeyboardProps) {
  const keys = buildPianoKeys(range);
  const activeSet = new Set(activeMidiNumbers);
  const whiteKeys = keys.filter((key) => !key.isBlack);
  const blackKeys = keys.filter((key) => key.isBlack);

  return (
    <section aria-label="Piano keyboard" className="piano-shell">
      <div
        className="piano-keyboard"
        style={{ "--white-key-count": whiteKeys.length } as CSSProperties}
      >
        <div className="piano-white-keys">
          {whiteKeys.map((key) => {
            const isActive = activeSet.has(key.midi);
            return (
              <button
                aria-label={key.name}
                aria-pressed={isActive}
                className="piano-key piano-key-white"
                data-active={isActive}
                key={key.midi}
                onBlur={() => onNoteUp(key.midi)}
                onPointerCancel={() => onNoteUp(key.midi)}
                onPointerDown={(event) => {
                  if (
                    event.currentTarget.setPointerCapture &&
                    event.pointerId !== undefined
                  ) {
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }
                  onNoteDown(key.midi);
                }}
                onPointerLeave={(event) => {
                  if (event.buttons > 0) {
                    onNoteUp(key.midi);
                  }
                }}
                onPointerUp={() => onNoteUp(key.midi)}
                type="button"
              >
                <span>{noteNameToPitchClass(key.name)}</span>
              </button>
            );
          })}
        </div>

        <div className="piano-black-keys" aria-hidden="false">
          {blackKeys.map((key) => {
            const isActive = activeSet.has(key.midi);
            const whiteIndex = getWhiteKeyIndex(key.midi, range);
            return (
              <button
                aria-label={key.name}
                aria-pressed={isActive}
                className="piano-key piano-key-black"
                data-active={isActive}
                key={key.midi}
                onBlur={() => onNoteUp(key.midi)}
                onPointerCancel={() => onNoteUp(key.midi)}
                onPointerDown={(event) => {
                  if (
                    event.currentTarget.setPointerCapture &&
                    event.pointerId !== undefined
                  ) {
                    event.currentTarget.setPointerCapture(event.pointerId);
                  }
                  onNoteDown(key.midi);
                }}
                onPointerUp={() => onNoteUp(key.midi)}
                style={{
                  left: `calc(((100% / ${whiteKeys.length}) * ${whiteIndex}) - ((100% / ${whiteKeys.length}) * ${BLACK_KEY_LEFT_OFFSET}))`,
                  width: `calc((100% / ${whiteKeys.length}) * 0.72)`,
                }}
                type="button"
              >
                <span>{noteNameToPitchClass(key.name)}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 8: Implement remaining presentation components**

Create `src/components/ProgressionTrail.tsx`:

```tsx
import type { ProgressionEntry } from "../music/progression";

type ProgressionTrailProps = {
  entries: ProgressionEntry[];
};

export function ProgressionTrail({ entries }: ProgressionTrailProps) {
  return (
    <section className="rounded-lg border border-white/10 bg-[var(--color-panel)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
        Recent progression
      </p>
      {entries.length > 0 ? (
        <ol className="mt-3 flex flex-wrap gap-2">
          {entries.map((entry) => (
            <li
              className="rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm font-medium text-amber-100"
              key={entry.id}
            >
              {entry.name}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Detected chords will appear here.
        </p>
      )}
    </section>
  );
}
```

Create `src/components/StatusBar.tsx`:

```tsx
import { Cable, Music2, Volume2, VolumeX } from "lucide-react";
import type { AudioStatus } from "../audio/useToneSynth";
import type { MidiStatus } from "../midi/useMidiInput";

type StatusBarProps = {
  midiStatus: MidiStatus;
  midiDeviceCount: number;
  midiError: string | null;
  onConnectMidi: () => void;
  audioStatus: AudioStatus;
  onEnableAudio: () => void;
  onDisableAudio: () => void;
};

function midiStatusLabel(status: MidiStatus, deviceCount: number): string {
  if (status === "unsupported") {
    return "MIDI unsupported";
  }

  if (status === "permission-needed") {
    return "MIDI permission needed";
  }

  if (status === "connected") {
    return `${deviceCount} MIDI input${deviceCount === 1 ? "" : "s"} connected`;
  }

  if (status === "disconnected") {
    return "No MIDI inputs";
  }

  return "MIDI error";
}

export function StatusBar({
  midiStatus,
  midiDeviceCount,
  midiError,
  onConnectMidi,
  audioStatus,
  onEnableAudio,
  onDisableAudio,
}: StatusBarProps) {
  const audioOn = audioStatus === "on";

  return (
    <header className="flex flex-col gap-3 rounded-lg border border-white/10 bg-[var(--color-panel)] p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-md bg-teal-300/10 text-teal-200">
          <Music2 aria-hidden="true" size={20} />
        </div>
        <div>
          <h1 className="text-xl font-semibold">Progresifo</h1>
          <p className="text-sm text-[var(--color-muted)]">Piano chord workspace</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-text)] transition hover:bg-white/10"
          onClick={onConnectMidi}
          type="button"
        >
          <Cable aria-hidden="true" size={16} />
          {midiStatusLabel(midiStatus, midiDeviceCount)}
        </button>
        <button
          className="inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-[var(--color-text)] transition hover:bg-white/10"
          onClick={audioOn ? onDisableAudio : onEnableAudio}
          type="button"
        >
          {audioOn ? (
            <Volume2 aria-hidden="true" size={16} />
          ) : (
            <VolumeX aria-hidden="true" size={16} />
          )}
          Sound {audioOn ? "on" : audioStatus === "starting" ? "starting" : "off"}
        </button>
      </div>

      {midiStatus === "unsupported" ? (
        <p className="text-sm text-[var(--color-error)]">
          Web MIDI is unavailable in this browser. Use Chrome, Edge, Opera, or Firefox.
        </p>
      ) : null}
      {midiError ? <p className="text-sm text-[var(--color-error)]">{midiError}</p> : null}
    </header>
  );
}
```

- [ ] **Step 9: Run component tests and typecheck**

Run:

```bash
npm test -- src/components
npm run lint
```

Expected: PASS.

- [ ] **Step 10: Commit components**

Run:

```bash
git add src/components
git commit -m "feat: add piano learning interface components"
```

---

### Task 6: Compose App State and Responsive Behavior

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Create: `src/components/__tests__/App.test.tsx`

- [ ] **Step 1: Write app integration test**

Create `src/components/__tests__/App.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../../App";

describe("App", () => {
  it("updates readout when pressing on-screen piano keys", () => {
    render(<App />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }));

    expect(screen.getByRole("heading", { name: "C" })).toBeInTheDocument();
    expect(screen.getByText("C4 E4 G4")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run app integration test and confirm failure**

Run:

```bash
npm test -- src/components/__tests__/App.test.tsx
```

Expected: FAIL because `App.tsx` still renders the temporary shell.

- [ ] **Step 3: Implement composed app**

Replace `src/App.tsx` with:

```tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useToneSynth } from "./audio/useToneSynth";
import { ChordReadout } from "./components/ChordReadout";
import { PianoKeyboard } from "./components/PianoKeyboard";
import { ProgressionTrail } from "./components/ProgressionTrail";
import { StatusBar } from "./components/StatusBar";
import { useMidiInput } from "./midi/useMidiInput";
import {
  addActiveNote,
  getDisplayNotes,
  getUniqueMidiNumbers,
  removeActiveNote,
} from "./music/activeNotes";
import { detectChord } from "./music/chords";
import {
  FULL_PIANO_RANGE,
  MOBILE_PIANO_RANGE,
} from "./music/notes";
import {
  addChordToProgression,
  type ProgressionEntry,
} from "./music/progression";
import type { ActiveNote } from "./music/types";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window === "undefined" || typeof window.matchMedia !== "function"
      ? false
      : window.matchMedia("(max-width: 767px)").matches,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const media = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(media.matches);

    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export default function App() {
  const [activeNotes, setActiveNotes] = useState<ActiveNote[]>([]);
  const [progression, setProgression] = useState<ProgressionEntry[]>([]);
  const audio = useToneSynth();
  const isMobile = useIsMobile();
  const range = isMobile ? MOBILE_PIANO_RANGE : FULL_PIANO_RANGE;

  const handleNoteDown = useCallback(
    (midi: number, velocity = 100, source: "pointer" | "midi" = "pointer") => {
      const startedAt = Date.now();
      setActiveNotes((current) =>
        addActiveNote(current, { midi, source, velocity, startedAt }),
      );
      audio.triggerAttack(midi, velocity);
    },
    [audio],
  );

  const handleNoteUp = useCallback(
    (midi: number, source: "pointer" | "midi" = "pointer") => {
      setActiveNotes((current) => removeActiveNote(current, midi, source));
      audio.triggerRelease(midi);
    },
    [audio],
  );

  const midi = useMidiInput({
    onNoteOn: ({ midi, velocity }) => handleNoteDown(midi, velocity, "midi"),
    onNoteOff: ({ midi }) => handleNoteUp(midi, "midi"),
  });

  const detection = useMemo(() => detectChord(activeNotes), [activeNotes]);
  const displayNotes = useMemo(() => getDisplayNotes(activeNotes), [activeNotes]);
  const activeMidiNumbers = useMemo(
    () => getUniqueMidiNumbers(activeNotes),
    [activeNotes],
  );

  useEffect(() => {
    setProgression((current) =>
      addChordToProgression(current, detection.primary, Date.now()),
    );
  }, [detection.primary]);

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-3 py-3 text-[var(--color-text)] md:px-6 md:py-5">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-7xl grid-rows-[auto_auto_1fr_auto] gap-4 md:min-h-[calc(100vh-2.5rem)]">
        <StatusBar
          audioStatus={audio.status}
          midiDeviceCount={midi.devices.length}
          midiError={midi.errorMessage}
          midiStatus={midi.status}
          onConnectMidi={midi.connect}
          onDisableAudio={audio.disable}
          onEnableAudio={audio.enable}
        />

        <ChordReadout detection={detection} displayNotes={displayNotes} />

        <PianoKeyboard
          activeMidiNumbers={activeMidiNumbers}
          onNoteDown={(midi) => handleNoteDown(midi)}
          onNoteUp={(midi) => handleNoteUp(midi)}
          range={range}
        />

        <ProgressionTrail entries={progression} />
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Replace CSS with full dark piano styling**

Append to `src/styles.css` after the existing rules:

```css
.piano-shell {
  min-height: 260px;
  display: grid;
  align-items: end;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 8px;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 0.06), rgb(255 255 255 / 0)),
    var(--color-panel);
  padding: clamp(0.75rem, 2vw, 1.25rem);
  box-shadow: 0 24px 80px rgb(0 0 0 / 0.28);
}

.piano-keyboard {
  position: relative;
  width: 100%;
  height: clamp(220px, 42vh, 430px);
  min-height: 220px;
}

.piano-white-keys {
  display: grid;
  grid-template-columns: repeat(var(--white-key-count), minmax(0, 1fr));
  height: 100%;
}

.piano-black-keys {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.piano-key {
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}

.piano-key-white {
  position: relative;
  display: flex;
  align-items: end;
  justify-content: center;
  min-width: 0;
  border: 1px solid rgb(16 18 20 / 0.65);
  border-bottom-left-radius: 6px;
  border-bottom-right-radius: 6px;
  background: linear-gradient(180deg, #fffaf0 0%, var(--color-key-white) 100%);
  color: #25282b;
  padding: 0.35rem 0.15rem;
  transition:
    background 80ms ease,
    transform 80ms ease,
    filter 80ms ease;
}

.piano-key-white[data-active="true"] {
  background: linear-gradient(180deg, #c7fff8 0%, var(--color-key-white-pressed) 100%);
  transform: translateY(2px);
  filter: drop-shadow(0 0 14px rgb(142 232 220 / 0.42));
}

.piano-key-black {
  position: absolute;
  top: 0;
  z-index: 2;
  height: 62%;
  display: flex;
  align-items: end;
  justify-content: center;
  border: 1px solid rgb(255 255 255 / 0.16);
  border-bottom-left-radius: 5px;
  border-bottom-right-radius: 5px;
  background: linear-gradient(180deg, #30343a 0%, var(--color-key-black) 100%);
  color: rgb(255 255 255 / 0.72);
  padding: 0.3rem 0.1rem;
  pointer-events: auto;
  transition:
    background 80ms ease,
    transform 80ms ease,
    filter 80ms ease;
}

.piano-key-black[data-active="true"] {
  background: linear-gradient(180deg, #20d7c7 0%, var(--color-key-black-pressed) 100%);
  color: #05221f;
  transform: translateY(2px);
  filter: drop-shadow(0 0 14px rgb(18 184 170 / 0.5));
}

.piano-key span {
  overflow: hidden;
  max-width: 100%;
  font-size: clamp(0.52rem, 0.8vw, 0.78rem);
  font-weight: 700;
  line-height: 1;
  text-overflow: clip;
  white-space: nowrap;
}

@media (max-width: 767px) {
  .piano-shell {
    min-height: 240px;
  }

  .piano-keyboard {
    height: min(42vh, 320px);
  }

  .piano-key span {
    font-size: 0.68rem;
  }
}
```

- [ ] **Step 5: Run app integration test and confirm pass**

Run:

```bash
npm test -- src/components/__tests__/App.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run full verification**

Run:

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 7: Commit app integration**

Run:

```bash
git add src/App.tsx src/styles.css src/components/__tests__/App.test.tsx
git commit -m "feat: connect piano chord learning workflow"
```

---

### Task 7: Browser Verification and UI Polish

**Files:**
- Inspect: `src/App.tsx`
- Inspect: `src/styles.css`
- Inspect: `src/components/PianoKeyboard.tsx`
- Inspect: `src/components/StatusBar.tsx`

- [ ] **Step 1: Start dev server**

Run:

```bash
npm run dev
```

Expected: Vite prints a local URL, usually `http://localhost:5173/`.

- [ ] **Step 2: Open desktop viewport**

Open the app in the in-app browser or a local browser at the Vite URL with a desktop viewport around `1440x900`.

Expected:
- Dark theme fills the viewport.
- Full 88-key piano from `A0` through `C8` is visible.
- Chord readout, status controls, piano, and progression trail do not overlap.
- Piano key labels remain inside their keys.

- [ ] **Step 3: Verify desktop interaction**

Using the browser:
- Click `C4`, `E4`, and `G4`.
- Confirm the keys highlight.
- Confirm primary chord shows `C`.
- Confirm pressed notes show `C4 E4 G4`.
- Release keys and confirm highlights clear.

Expected: visual state follows pointer press and release.

- [ ] **Step 4: Verify optional sound**

Using the browser:
- Click the sound control.
- Press `C4`, `E4`, and `G4`.
- Toggle sound off.

Expected:
- Browser permits Tone.js startup from the click gesture.
- Notes sound only after sound is enabled.
- Turning sound off releases active audio.

- [ ] **Step 5: Verify mobile viewport**

Resize to a mobile viewport around `390x844`.

Expected:
- Keyboard shows two octaves.
- Middle C is visible.
- Key labels are legible.
- No UI text overlaps or escapes its container.
- The keyboard remains playable without tiny full-piano keys.

- [ ] **Step 6: Verify MIDI states manually**

In a Web MIDI-capable browser:
- Load the app with no MIDI controller connected.
- Click MIDI connect.
- Connect a USB MIDI controller.
- Press and release notes and chords.

Expected:
- No-controller state reads `No MIDI inputs`.
- Connected state shows the number of MIDI inputs.
- MIDI note-on highlights matching keys and updates chord readout.
- MIDI note-off clears matching highlights.
- If Web MIDI is unavailable, the UI recommends Chrome, Edge, Opera, or Firefox.

- [ ] **Step 7: Run final verification**

Stop the dev server and run:

```bash
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 8: Commit UI polish changes**

If browser verification required changes, run:

```bash
git add src/App.tsx src/styles.css src/components/PianoKeyboard.tsx src/components/StatusBar.tsx
git commit -m "fix: polish responsive piano workspace"
```

If browser verification required no changes, do not create an empty commit.

---

## Plan Self-Review

- Spec coverage: the plan covers the dark theme, full desktop piano, two-octave mobile piano, pointer input, native Web MIDI input, optional Tone.js sound, primary and alternate chord candidates, progression trail, accessibility labels, unit tests, component tests, and manual MIDI verification.
- Placeholder scan: no placeholder markers or incomplete implementation steps are present.
- Type consistency: shared types are introduced before hooks and components use them; `ChordDetection`, `ActiveNote`, `PianoRange`, `MidiStatus`, and `AudioStatus` names are consistent across tasks.
