# Scale Learning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Add a Scales workspace where users can inspect common scale notes, see them on a mini piano and staff, and validate practice input on the shared piano.

**Architecture:** Keep scale theory in a dedicated `src/music/scales.ts` module with a curated catalog and pure helper functions. Build focused React components for catalog selection, detail display, mini piano map, and staff notation, then route the active workspace in `App` so scale hints reuse the existing piano/MIDI/audio flow without affecting progression state.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, Tonal, existing global CSS in `src/styles.css`.

---

## File Structure

- Create `src/music/scales.ts`: scale catalog, display spelling, MIDI target building, staff data, and pitch-class validation.
- Create `src/music/__tests__/scales.test.ts`: domain tests for catalog integrity, note generation, spelling, MIDI hints, and matching.
- Modify `src/music/types.ts`: shared scale catalog and view-model types plus `WorkspaceMode`.
- Create `src/components/ScaleLearningPanel.tsx`: scale workspace state and composition.
- Create `src/components/ScaleTypeList.tsx`: grouped scale catalog selector.
- Create `src/components/ScaleTypeDetail.tsx`: selected scale explanation, notes, match status, mini piano map, and staff.
- Create `src/components/MiniPianoMap.tsx`: compact non-interactive piano strip.
- Create `src/components/ScaleStaff.tsx`: simple SVG staff notation.
- Create `src/components/__tests__/ScaleLearningPanel.test.tsx`: focused scale workspace behavior tests.
- Modify `src/components/WorkspaceTabs.tsx`: add `Scales` tab and roving navigation over three tabs.
- Modify `src/App.tsx`: add scale workspace state/hints and render the scale panel.
- Modify `src/components/__tests__/App.test.tsx`: integration tests for tab wiring, hints, matching, and progression isolation.
- Modify `src/styles.css`: scale workspace, mini piano, and staff styles.

## Task 1: Add Scale Domain Model

**Files:**
- Create: `src/music/scales.ts`
- Create: `src/music/__tests__/scales.test.ts`
- Modify: `src/music/types.ts`

- [x] **Step 1: Add failing domain tests**

Create `src/music/__tests__/scales.test.ts` with tests for:

- unique catalog IDs in the expected order;
- family ordering;
- C major note generation;
- Bb major conventional display spelling;
- A minor pentatonic notes;
- mobile-range MIDI target generation;
- exact octave-independent pitch-class matching;
- rejection of missing and outside notes;
- staff note generation.

Run: `npm test -- src/music/__tests__/scales.test.ts --run`

Expected: fail because `src/music/scales.ts` does not exist.

- [x] **Step 2: Add shared scale types**

Update `src/music/types.ts`:

```ts
export type WorkspaceMode = "progressions" | "chord-construction" | "scales";

export type ScaleFamily = "core" | "pentatonic-blues" | "modes" | "symmetric";

export type ScaleGenre =
  | "pop"
  | "classical"
  | "jazz"
  | "blues"
  | "funk"
  | "rock"
  | "film";

export type ScaleType = {
  readonly id: string;
  readonly family: ScaleFamily;
  readonly name: string;
  readonly intervals: readonly number[];
  readonly formula: string;
  readonly steps: string;
  readonly description: string;
  readonly usage: string;
  readonly genres: readonly ScaleGenre[];
};

export type ScaleTarget = {
  readonly noteNames: string[];
  readonly pitchClasses: string[];
  readonly midiNumbers: number[];
};

export type ScaleStaffNote = {
  readonly noteName: string;
  readonly pitchClass: string;
  readonly octave: number;
  readonly staffStep: number;
};
```

- [x] **Step 3: Implement minimal scale module**

Create `src/music/scales.ts` with:

- `SCALE_FAMILY_ORDER`
- `SCALE_TYPES`
- `getScaleTypeById`
- `getScaleTypesByFamily`
- `buildScaleTarget`
- `buildScaleStaffNotes`
- `doesPitchClassSetMatchScaleTarget`

Use app-owned display spelling for major/minor keys and `tonal` for validation normalization.

- [x] **Step 4: Run domain tests green**

Run: `npm test -- src/music/__tests__/scales.test.ts --run`

Expected: pass.

## Task 2: Add Scale Workspace Components

**Files:**
- Create: `src/components/ScaleLearningPanel.tsx`
- Create: `src/components/ScaleTypeList.tsx`
- Create: `src/components/ScaleTypeDetail.tsx`
- Create: `src/components/MiniPianoMap.tsx`
- Create: `src/components/ScaleStaff.tsx`
- Create: `src/components/__tests__/ScaleLearningPanel.test.tsx`

- [x] **Step 1: Add failing component tests**

Create `src/components/__tests__/ScaleLearningPanel.test.tsx` with tests for:

- default C major scale detail renders note list, formula, step pattern, mini piano, staff, and unmatched status;
- selecting `Minor pentatonic` updates the notes;
- changing the root to `Bb` displays `Bb C D Eb F G A`;
- exact active pitch classes mark the scale as matched;
- selected scale emits target MIDI numbers through `onTargetChange`.

Run: `npm test -- src/components/__tests__/ScaleLearningPanel.test.tsx --run`

Expected: fail because the components do not exist.

- [x] **Step 2: Implement focused components**

Add the components listed above. `ScaleLearningPanel` owns local root and scale type state. `ScaleTypeDetail` renders `MiniPianoMap` and `ScaleStaff`. `MiniPianoMap` is non-interactive and only marks selected pitch classes. `ScaleStaff` is a simple accessible SVG, not a notation engine.

- [x] **Step 3: Run component tests green**

Run: `npm test -- src/components/__tests__/ScaleLearningPanel.test.tsx --run`

Expected: pass.

## Task 3: Integrate Scales Workspace

**Files:**
- Modify: `src/components/WorkspaceTabs.tsx`
- Modify: `src/App.tsx`
- Modify: `src/components/__tests__/App.test.tsx`

- [x] **Step 1: Add failing app integration tests**

Extend `src/components/__tests__/App.test.tsx` with tests that:

- assert the `Scales` tab and `workspace-panel-scales` are wired;
- verify roving keyboard navigation cycles across three tabs;
- switch to `Scales`, select `Minor pentatonic`, and assert shared piano hints match the scale target;
- play all target pitch classes and see `Matched`;
- confirm scale notes do not update recent progression or compass context.

Run: `npm test -- src/components/__tests__/App.test.tsx --run`

Expected: fail because the app does not expose the scale workspace.

- [x] **Step 2: Wire the workspace**

Add `"scales"` to `WorkspaceMode`, add the tab, add `scaleHintedMidiNumbers` in `App`, render `ScaleLearningPanel`, and route `hintedMidiNumbers` by active workspace.

- [x] **Step 3: Run app tests green**

Run: `npm test -- src/components/__tests__/App.test.tsx --run`

Expected: pass.

## Task 4: Style and Verify

**Files:**
- Modify: `src/styles.css`

- [x] **Step 1: Add scale workspace styles**

Style `.scale-learning`, `.scale-type-list`, `.scale-type-detail`, `.mini-piano-map`, and `.scale-staff` using the existing panel, button, and responsive layout patterns.

- [x] **Step 2: Run focused tests after styling**

Run:

```sh
npm test -- src/music/__tests__/scales.test.ts src/components/__tests__/ScaleLearningPanel.test.tsx src/components/__tests__/App.test.tsx --run
```

Expected: pass.

- [x] **Step 3: Run full verification**

Run: `make verify`

Expected: tests, typechecking, and production build pass.

- [x] **Step 4: Browser smoke check**

Run `make dev`, open the local app, inspect the Scales workspace at desktop and mobile widths, and verify the piano hints, mini piano, staff, and match status render coherently.
