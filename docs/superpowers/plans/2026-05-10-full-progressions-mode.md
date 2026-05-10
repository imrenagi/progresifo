# Full Progressions Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a curated `Full progressions` practice mode with complete progression cards, a right-side chord-key practice rail, keyboard hints, and auto-advance.

**Architecture:** Keep progression content and resolution in the music domain, then render it through a focused `ProgressionPracticeRail` component. `App.tsx` owns mode selection and practice state while preserving the current `Next moves` compass behavior.

**Tech Stack:** React, Vite, TypeScript, Tailwind CSS v4 stylesheet, Vitest, Testing Library, existing Tone.js and Web MIDI hooks.

---

## File Structure

- Create `src/music/progressionLibrary.ts`
  - Own curated complete progression definitions.
  - Resolve graph node IDs into transposed labels and target voicings.
  - Export helpers for selecting the first progression and matching a step.
- Modify `src/music/types.ts`
  - Add `ProgressionDisplayMode`, `CuratedProgression`, `ResolvedProgressionStep`, and `ResolvedProgression`.
- Create `src/music/__tests__/progressionLibrary.test.ts`
  - Cover resolution, transposition, target notes, graph-node validation, and matching.
- Create `src/components/ProgressionPracticeRail.tsx`
  - Render full progression cards and the right-side practice rail.
  - Expose callbacks for progression selection and step selection.
- Create `src/components/__tests__/ProgressionPracticeRail.test.tsx`
  - Cover selected card state, active/matched/complete rail state, and callbacks.
- Modify `src/App.tsx`
  - Add display mode, full progression selection, active step, matched step, completion state, and guarded auto-advance.
  - Route keyboard hints from either the current compass suggestion or active full-progression step.
- Modify `src/components/__tests__/App.test.tsx`
  - Cover mode toggle, rail rendering, active hint updates, auto-advance, final-step loop, reset behavior, and recent-trail behavior.
- Modify `src/styles.css`
  - Add mode toggle, progression practice layout, progression cards, and rail styles.

## Task 1: Domain Types and Curated Progression Resolver

**Files:**
- Modify: `src/music/types.ts`
- Create: `src/music/progressionLibrary.ts`
- Test: `src/music/__tests__/progressionLibrary.test.ts`

- [ ] **Step 1: Add failing music-domain tests**

Create `src/music/__tests__/progressionLibrary.test.ts` with:

```ts
import { describe, expect, it } from "vitest";
import {
  doesProgressionStepMatchPitchClasses,
  getFirstProgressionId,
  getResolvedProgression,
  getResolvedProgressions,
  validateCuratedProgressions,
} from "../progressionLibrary";

describe("progressionLibrary", () => {
  it("resolves curated progressions into transposed display sequences", () => {
    const progressions = getResolvedProgressions("pop", "major", "D");

    expect(progressions.length).toBeGreaterThanOrEqual(2);
    expect(progressions[0]).toMatchObject({
      id: "pop-axis",
      name: "Axis Progression",
      displaySequence: "I (D) - V7 (A7) - vi (Bm) - IV (G)",
    });
    expect(progressions[0].steps.map((step) => step.displayName)).toEqual([
      "I (D)",
      "V7 (A7)",
      "vi (Bm)",
      "IV (G)",
    ]);
  });

  it("returns the first progression id for a genre and mode", () => {
    expect(getFirstProgressionId("pop", "major")).toBe("pop-axis");
    expect(getFirstProgressionId("pop", "minor")).toBe("pop-minor-loop");
  });

  it("resolves one selected progression with concrete target keys", () => {
    const progression = getResolvedProgression(
      "pop",
      "major",
      "C",
      "pop-axis",
    );

    expect(progression?.steps[0]).toMatchObject({
      nodeId: "I",
      displayName: "I (C)",
      target: {
        noteNames: ["C4", "E4", "G4"],
        midiNumbers: [60, 64, 67],
        pitchClasses: ["C", "E", "G"],
      },
    });
    expect(progression?.steps[1]).toMatchObject({
      nodeId: "V7",
      displayName: "V7 (G7)",
      target: {
        noteNames: ["G4", "B4", "D5", "F5"],
        midiNumbers: [67, 71, 74, 77],
        pitchClasses: ["G", "B", "D", "F"],
      },
    });
  });

  it("matches a progression step across inversions and octaves", () => {
    const progression = getResolvedProgression(
      "pop",
      "major",
      "C",
      "pop-axis",
    );

    expect(progression).not.toBeNull();
    expect(
      doesProgressionStepMatchPitchClasses(
        progression!.steps[2],
        ["E", "A", "C"],
      ),
    ).toBe(true);
    expect(
      doesProgressionStepMatchPitchClasses(progression!.steps[2], ["A", "C"]),
    ).toBe(false);
  });

  it("includes curated progressions for every supported genre and mode", () => {
    expect(validateCuratedProgressions()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the new test to verify it fails**

Run:

```bash
npm test -- src/music/__tests__/progressionLibrary.test.ts
```

Expected: fail because `src/music/progressionLibrary.ts` does not exist and the new types are not exported.

- [ ] **Step 3: Add domain types**

In `src/music/types.ts`, add these exports after `KeyMode`:

```ts
export type ProgressionDisplayMode = "next-moves" | "full-progressions";
```

Add these exports after `CompassNodeView`:

```ts
export type CuratedProgression = {
  id: string;
  name: string;
  nodeIds: string[];
  description?: string;
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
```

- [ ] **Step 4: Create the progression library implementation**

Create `src/music/progressionLibrary.ts`:

```ts
import {
  buildCompassNodeView,
  buildTargetVoicingForNode,
  doesPitchClassSetMatchTarget,
} from "./progressionCompass";
import {
  PROGRESSION_GENRES,
  getProgressionNode,
} from "./progressionGraph";
import type {
  CuratedProgression,
  KeyMode,
  ProgressionGenre,
  ResolvedProgression,
  ResolvedProgressionStep,
} from "./types";

const curatedProgressions: Record<
  ProgressionGenre,
  Record<KeyMode, CuratedProgression[]>
> = {
  pop: {
    major: [
      {
        id: "pop-axis",
        name: "Axis Progression",
        nodeIds: ["I", "V7", "vi", "IV"],
        description: "A familiar four-chord loop for modern pop practice.",
      },
      {
        id: "pop-lift",
        name: "Lift Progression",
        nodeIds: ["I", "IV", "V7", "I"],
        description: "A direct tonic, lift, tension, and resolve pattern.",
      },
      {
        id: "pop-soft-loop",
        name: "Soft Loop",
        nodeIds: ["vi", "IV", "I", "V7"],
        description: "Starts with minor color before resolving into the key.",
      },
    ],
    minor: [
      {
        id: "pop-minor-loop",
        name: "Minor Loop",
        nodeIds: ["i", "VI", "III", "VII"],
        description: "A broad minor-key loop with familiar pop motion.",
      },
      {
        id: "pop-minor-cadence",
        name: "Minor Cadence",
        nodeIds: ["i", "iv", "V7", "i"],
        description: "A compact minor cadence with dominant pull.",
      },
    ],
  },
  jazz: {
    major: [
      {
        id: "jazz-two-five-one",
        name: "ii-V-I",
        nodeIds: ["ii7", "V7", "Imaj7"],
        description: "The core major jazz cadence.",
      },
      {
        id: "jazz-one-six-two-five",
        name: "I-vi-ii-V",
        nodeIds: ["Imaj7", "vi7", "ii7", "V7"],
        description: "A classic turnaround loop.",
      },
    ],
    minor: [
      {
        id: "jazz-minor-two-five-one",
        name: "Minor ii-V-i",
        nodeIds: ["iim7b5", "V7alt", "i7"],
        description: "The core minor jazz cadence.",
      },
      {
        id: "jazz-minor-color",
        name: "Minor Color Turnaround",
        nodeIds: ["i7", "iv7", "iim7b5", "V7alt"],
        description: "A darker turnaround with minor color.",
      },
    ],
  },
  blues: {
    major: [
      {
        id: "blues-one-four-five",
        name: "I-IV-V Blues",
        nodeIds: ["I7", "IV7", "I7", "V7"],
        description: "A compact version of the essential blues motion.",
      },
      {
        id: "blues-turnaround",
        name: "Blues Turnaround",
        nodeIds: ["I7", "#IVdim7", "I7", "V7"],
        description: "A common blues turnaround shape.",
      },
    ],
    minor: [
      {
        id: "blues-minor-one-four-five",
        name: "Minor Blues",
        nodeIds: ["i7", "iv7", "i7", "V7"],
        description: "A concise minor blues practice loop.",
      },
    ],
  },
  classical: {
    major: [
      {
        id: "classical-authentic-cadence",
        name: "Authentic Cadence",
        nodeIds: ["I", "IV", "V7", "I"],
        description: "A clear predominant, dominant, tonic cadence.",
      },
      {
        id: "classical-circle",
        name: "Circle Motion",
        nodeIds: ["I", "vi", "ii", "V7", "I"],
        description: "A practical circle-of-fifths progression.",
      },
    ],
    minor: [
      {
        id: "classical-minor-cadence",
        name: "Minor Cadence",
        nodeIds: ["i", "iv", "V7", "i"],
        description: "A strong minor-key cadence.",
      },
      {
        id: "classical-leading-tone",
        name: "Leading-Tone Resolution",
        nodeIds: ["i", "iv", "viio7", "i"],
        description: "Uses leading-tone diminished color before resolving.",
      },
    ],
  },
  gospel: {
    major: [
      {
        id: "gospel-one-six-two-five",
        name: "I-vi-ii-V",
        nodeIds: ["I", "vi", "ii7", "V7sus4"],
        description: "A warm gospel turnaround.",
      },
      {
        id: "gospel-plagal",
        name: "Plagal Color",
        nodeIds: ["I", "IV", "V/V", "V7"],
        description: "Moves through major and borrowed minor plagal color.",
      },
    ],
    minor: [
      {
        id: "gospel-minor-walk",
        name: "Minor Walk",
        nodeIds: ["i", "ivm7", "V7sus4", "i"],
        description: "A soulful minor walkdown into dominant tension.",
      },
    ],
  },
  "neo-soul": {
    major: [
      {
        id: "neo-soul-plagal",
        name: "Neo-Soul Plagal",
        nodeIds: ["Imaj7", "IVmaj7", "ii7", "V7sus4"],
        description: "A colorful major-to-minor plagal loop.",
      },
      {
        id: "neo-soul-borrowed",
        name: "Borrowed Dominant",
        nodeIds: ["Imaj7", "bVII13sus", "IVmaj7", "Imaj7"],
        description: "Uses borrowed dominant color before returning home.",
      },
    ],
    minor: [
      {
        id: "neo-soul-minor-color",
        name: "Minor Color Loop",
        nodeIds: ["i9", "iv9", "V7sus4", "i9"],
        description: "A lush minor loop with suspended color.",
      },
    ],
  },
};

function resolveStep(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  nodeId: string,
): ResolvedProgressionStep {
  const nodeView = buildCompassNodeView(genre, mode, keyRoot, nodeId);

  return {
    nodeId: nodeView.nodeId,
    romanNumeral: nodeView.romanNumeral,
    chordName: nodeView.chordName,
    displayName: nodeView.displayName,
    target: buildTargetVoicingForNode(genre, mode, keyRoot, nodeId),
  };
}

export function getCuratedProgressions(
  genre: ProgressionGenre,
  mode: KeyMode,
): CuratedProgression[] {
  return curatedProgressions[genre][mode];
}

export function getFirstProgressionId(
  genre: ProgressionGenre,
  mode: KeyMode,
): string | null {
  return getCuratedProgressions(genre, mode)[0]?.id ?? null;
}

export function resolveProgression(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  progression: CuratedProgression,
): ResolvedProgression {
  const steps = progression.nodeIds.map((nodeId) =>
    resolveStep(genre, mode, keyRoot, nodeId),
  );

  return {
    id: progression.id,
    name: progression.name,
    displaySequence: steps.map((step) => step.displayName).join(" - "),
    steps,
    ...(progression.description ? { description: progression.description } : {}),
  };
}

export function getResolvedProgressions(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
): ResolvedProgression[] {
  return getCuratedProgressions(genre, mode).map((progression) =>
    resolveProgression(genre, mode, keyRoot, progression),
  );
}

export function getResolvedProgression(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  progressionId: string | null,
): ResolvedProgression | null {
  if (!progressionId) {
    return null;
  }

  const progression = getCuratedProgressions(genre, mode).find(
    (candidate) => candidate.id === progressionId,
  );

  return progression
    ? resolveProgression(genre, mode, keyRoot, progression)
    : null;
}

export function doesProgressionStepMatchPitchClasses(
  step: ResolvedProgressionStep,
  pitchClasses: string[],
): boolean {
  return doesPitchClassSetMatchTarget(pitchClasses, step.target.pitchClasses);
}

export function validateCuratedProgressions(): string[] {
  const errors: string[] = [];

  PROGRESSION_GENRES.forEach((genre) => {
    (["major", "minor"] as KeyMode[]).forEach((mode) => {
      const progressions = getCuratedProgressions(genre, mode);

      if (progressions.length === 0) {
        errors.push(`${genre} ${mode} has no curated progressions.`);
      }

      progressions.forEach((progression) => {
        progression.nodeIds.forEach((nodeId) => {
          try {
            getProgressionNode(genre, mode, nodeId);
          } catch {
            errors.push(
              `${genre} ${mode} ${progression.id} references ${nodeId}.`,
            );
          }
        });
      });
    });
  });

  return errors;
}
```

- [ ] **Step 5: Run the domain test**

Run:

```bash
npm test -- src/music/__tests__/progressionLibrary.test.ts
```

Expected: pass.

- [ ] **Step 6: Commit the domain layer**

Run:

```bash
git add src/music/types.ts src/music/progressionLibrary.ts src/music/__tests__/progressionLibrary.test.ts
git commit -m "feat: add curated progression library"
```

## Task 2: Progression Practice Rail Component

**Files:**
- Create: `src/components/ProgressionPracticeRail.tsx`
- Create: `src/components/__tests__/ProgressionPracticeRail.test.tsx`
- Modify: `src/styles.css`

- [ ] **Step 1: Add failing component tests**

Create `src/components/__tests__/ProgressionPracticeRail.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProgressionPracticeRail } from "../ProgressionPracticeRail";
import type { ResolvedProgression } from "../../music/types";

const axis: ResolvedProgression = {
  id: "pop-axis",
  name: "Axis Progression",
  displaySequence: "I (C) - V7 (G7) - vi (Am) - IV (F)",
  description: "A familiar four-chord loop for modern pop practice.",
  steps: [
    {
      nodeId: "I",
      romanNumeral: "I",
      chordName: "C",
      displayName: "I (C)",
      target: {
        noteNames: ["C4", "E4", "G4"],
        midiNumbers: [60, 64, 67],
        pitchClasses: ["C", "E", "G"],
      },
    },
    {
      nodeId: "V7",
      romanNumeral: "V7",
      chordName: "G7",
      displayName: "V7 (G7)",
      target: {
        noteNames: ["G4", "B4", "D5", "F5"],
        midiNumbers: [67, 71, 74, 77],
        pitchClasses: ["G", "B", "D", "F"],
      },
    },
  ],
};

const lift: ResolvedProgression = {
  ...axis,
  id: "pop-lift",
  name: "Lift Progression",
  displaySequence: "I (C) - IV (F) - V7 (G7) - I (C)",
};

describe("ProgressionPracticeRail", () => {
  it("renders progression cards and selected practice steps", () => {
    render(
      <ProgressionPracticeRail
        activeStepIndex={0}
        isComplete={false}
        matchedStepIndex={null}
        onProgressionSelect={vi.fn()}
        onStepSelect={vi.fn()}
        progressions={[axis, lift]}
        selectedProgression={axis}
      />,
    );

    expect(
      screen.getByRole("region", { name: "Full progressions" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Axis Progression" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: "Lift Progression" }),
    ).toHaveAttribute("aria-pressed", "false");

    const rail = screen.getByRole("list", { name: "Practice steps" });
    expect(within(rail).getByText("I (C)")).toBeInTheDocument();
    expect(within(rail).getByText("C4 E4 G4")).toBeInTheDocument();
    expect(within(rail).getByText("V7 (G7)")).toBeInTheDocument();
    expect(within(rail).getByText("G4 B4 D5 F5")).toBeInTheDocument();
  });

  it("calls selection handlers for progression cards and rail steps", () => {
    const onProgressionSelect = vi.fn();
    const onStepSelect = vi.fn();

    render(
      <ProgressionPracticeRail
        activeStepIndex={0}
        isComplete={false}
        matchedStepIndex={null}
        onProgressionSelect={onProgressionSelect}
        onStepSelect={onStepSelect}
        progressions={[axis, lift]}
        selectedProgression={axis}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lift Progression" }));
    expect(onProgressionSelect).toHaveBeenCalledWith("pop-lift");

    fireEvent.click(screen.getByRole("button", { name: "Step 2: V7 (G7)" }));
    expect(onStepSelect).toHaveBeenCalledWith(1);
  });

  it("marks active, matched, and complete states", () => {
    render(
      <ProgressionPracticeRail
        activeStepIndex={1}
        isComplete={true}
        matchedStepIndex={0}
        onProgressionSelect={vi.fn()}
        onStepSelect={vi.fn()}
        progressions={[axis]}
        selectedProgression={axis}
      />,
    );

    expect(screen.getByText("Progression complete")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step 1: I (C)" })).toHaveAttribute(
      "data-matched",
      "true",
    );
    expect(screen.getByRole("button", { name: "Step 2: V7 (G7)" })).toHaveAttribute(
      "data-active",
      "true",
    );
  });

  it("renders an empty state without progressions", () => {
    render(
      <ProgressionPracticeRail
        activeStepIndex={0}
        isComplete={false}
        matchedStepIndex={null}
        onProgressionSelect={vi.fn()}
        onStepSelect={vi.fn()}
        progressions={[]}
        selectedProgression={null}
      />,
    );

    expect(
      screen.getByText("No curated full progressions for this selection yet."),
    ).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the component test to verify it fails**

Run:

```bash
npm test -- src/components/__tests__/ProgressionPracticeRail.test.tsx
```

Expected: fail because `ProgressionPracticeRail` does not exist.

- [ ] **Step 3: Create the practice rail component**

Create `src/components/ProgressionPracticeRail.tsx`:

```tsx
import type { ResolvedProgression } from "../music/types";

type ProgressionPracticeRailProps = {
  activeStepIndex: number;
  isComplete: boolean;
  matchedStepIndex: number | null;
  progressions: ResolvedProgression[];
  selectedProgression: ResolvedProgression | null;
  onProgressionSelect: (progressionId: string) => void;
  onStepSelect: (stepIndex: number) => void;
};

export function ProgressionPracticeRail({
  activeStepIndex,
  isComplete,
  matchedStepIndex,
  progressions,
  selectedProgression,
  onProgressionSelect,
  onStepSelect,
}: ProgressionPracticeRailProps) {
  return (
    <section className="progression-practice" aria-label="Full progressions">
      <div className="progression-practice__browser">
        <div className="progression-practice__header">
          <p className="progression-practice__label">Curated progressions</p>
          <h2 className="progression-practice__heading">
            Choose a progression
          </h2>
        </div>

        {progressions.length > 0 ? (
          <div className="progression-practice__cards">
            {progressions.map((progression) => {
              const selected = progression.id === selectedProgression?.id;

              return (
                <button
                  aria-label={progression.name}
                  aria-pressed={selected}
                  className="progression-practice__card"
                  data-selected={selected}
                  key={progression.id}
                  onClick={() => onProgressionSelect(progression.id)}
                  type="button"
                >
                  <span className="progression-practice__card-title">
                    {progression.name}
                  </span>
                  <span className="progression-practice__sequence">
                    {progression.displaySequence}
                  </span>
                  {progression.description ? (
                    <span className="progression-practice__description">
                      {progression.description}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="progression-practice__empty">
            No curated full progressions for this selection yet.
          </p>
        )}
      </div>

      <div className="progression-practice__rail">
        <div className="progression-practice__header">
          <p className="progression-practice__label">Practice rail</p>
          <h2 className="progression-practice__heading">
            {selectedProgression?.name ?? "No progression selected"}
          </h2>
        </div>

        {isComplete ? (
          <p className="progression-practice__complete">
            Progression complete
          </p>
        ) : null}

        {selectedProgression ? (
          <ol
            aria-label="Practice steps"
            className="progression-practice__steps"
          >
            {selectedProgression.steps.map((step, index) => {
              const active = index === activeStepIndex;
              const matched = index === matchedStepIndex;

              return (
                <li className="progression-practice__step-item" key={`${step.nodeId}-${index}`}>
                  <button
                    aria-label={`Step ${index + 1}: ${step.displayName}`}
                    className="progression-practice__step"
                    data-active={active}
                    data-matched={matched}
                    onClick={() => onStepSelect(index)}
                    type="button"
                  >
                    <span className="progression-practice__step-number">
                      {index + 1}
                    </span>
                    <span className="progression-practice__step-main">
                      <span className="progression-practice__step-title">
                        {step.displayName}
                      </span>
                      <span className="progression-practice__keys">
                        {step.target.noteNames.join(" ")}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="progression-practice__empty">
            Select a progression to see chord keys.
          </p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Add practice rail styles**

In `src/styles.css`, add `.progression-practice__label` and `.progression-practice__heading` to the existing reset selector near the top:

```css
.progression-practice__label,
.progression-practice__heading,
```

Add these styles after the existing `.progression-compass__keys` block:

```css
.progression-practice {
  display: grid;
  gap: 1rem;
  border: 1px solid rgba(243, 245, 241, 0.1);
  border-radius: 0.5rem;
  padding: 1rem;
  background: rgba(24, 28, 32, 0.86);
  box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, 0.2);
}

.progression-practice__browser,
.progression-practice__rail {
  min-width: 0;
}

.progression-practice__header {
  display: grid;
  gap: 0.35rem;
}

.progression-practice__label {
  color: var(--color-muted);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0;
  text-transform: uppercase;
}

.progression-practice__heading {
  font-size: 1.15rem;
  line-height: 1.15;
}

.progression-practice__cards,
.progression-practice__steps {
  display: grid;
  gap: 0.625rem;
  margin-top: 0.875rem;
}

.progression-practice__steps {
  padding: 0;
  list-style: none;
}

.progression-practice__card,
.progression-practice__step {
  display: grid;
  width: 100%;
  border: 1px solid rgba(243, 245, 241, 0.13);
  border-radius: 0.5rem;
  background: rgba(243, 245, 241, 0.06);
  color: var(--color-text);
  cursor: pointer;
  text-align: left;
}

.progression-practice__card {
  gap: 0.35rem;
  padding: 0.75rem;
}

.progression-practice__step {
  grid-template-columns: 2rem minmax(0, 1fr);
  gap: 0.625rem;
  align-items: center;
  padding: 0.625rem;
}

.progression-practice__card:hover,
.progression-practice__card[data-selected="true"],
.progression-practice__step:hover,
.progression-practice__step[data-active="true"] {
  border-color: rgba(242, 184, 75, 0.55);
  background: rgba(242, 184, 75, 0.13);
}

.progression-practice__step[data-matched="true"] {
  border-color: rgba(142, 232, 220, 0.78);
  background: rgba(142, 232, 220, 0.16);
}

.progression-practice__card-title,
.progression-practice__step-title {
  font-weight: 800;
}

.progression-practice__sequence,
.progression-practice__description,
.progression-practice__empty,
.progression-practice__complete {
  color: var(--color-muted);
  font-size: 0.86rem;
}

.progression-practice__keys {
  color: var(--color-text);
  font-size: 0.86rem;
  font-weight: 750;
}

.progression-practice__step-number {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border-radius: 999px;
  background: rgba(243, 245, 241, 0.1);
  color: var(--color-muted);
  font-weight: 800;
}

.progression-practice__step-main {
  display: grid;
  min-width: 0;
  gap: 0.2rem;
}

.progression-practice__complete {
  margin-top: 0.875rem;
  color: var(--color-key-white-pressed);
  font-weight: 800;
}
```

Add this media query near the existing responsive rules:

```css
@media (min-width: 58rem) {
  .progression-practice {
    grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.9fr);
    align-items: start;
  }
}
```

- [ ] **Step 5: Run the component test**

Run:

```bash
npm test -- src/components/__tests__/ProgressionPracticeRail.test.tsx
```

Expected: pass.

- [ ] **Step 6: Commit the practice rail component**

Run:

```bash
git add src/components/ProgressionPracticeRail.tsx src/components/__tests__/ProgressionPracticeRail.test.tsx src/styles.css
git commit -m "feat: add progression practice rail"
```

## Task 3: Display Mode Toggle and App Wiring

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/styles.css`
- Test: `src/components/__tests__/App.test.tsx`

- [ ] **Step 1: Add failing app tests for mode switching and rail rendering**

Append these tests before the closing `});` in `src/components/__tests__/App.test.tsx`:

```tsx
  it("toggles from next moves to full progressions", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Next moves" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));

    expect(
      screen.getByRole("region", { name: "Full progressions" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Axis Progression" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("I (C) - V7 (G7) - vi (Am) - IV (F)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step 1: I (C)" })).toHaveAttribute(
      "data-active",
      "true",
    );
  });

  it("uses the active full progression step as the piano hint", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));

    expect(screen.getByRole("button", { name: "C4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "E4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "G4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Step 2: V7 (G7)" }));

    expect(screen.getByRole("button", { name: "G4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "B4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "D5" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "F5" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
  });

  it("resets selected full progression when key mode changes", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));
    fireEvent.change(screen.getByLabelText("Key mode"), {
      target: { value: "minor" },
    });

    expect(screen.getByRole("button", { name: "Minor Loop" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Step 1: i (Cm)" })).toHaveAttribute(
      "data-active",
      "true",
    );
  });
```

- [ ] **Step 2: Run the focused app tests to verify they fail**

Run:

```bash
npm test -- src/components/__tests__/App.test.tsx -t "full progressions|piano hint|resets selected full progression"
```

Expected: fail because the mode toggle and practice rail are not wired into `App.tsx`.

- [ ] **Step 3: Add imports and mode state in `App.tsx`**

In `src/App.tsx`, add imports:

```ts
import { ProgressionPracticeRail } from "./components/ProgressionPracticeRail";
import {
  getFirstProgressionId,
  getResolvedProgression,
  getResolvedProgressions,
} from "./music/progressionLibrary";
import type { ProgressionDisplayMode } from "./music/types";
```

Add state near the existing progression state:

```ts
  const [progressionDisplayMode, setProgressionDisplayMode] =
    useState<ProgressionDisplayMode>("next-moves");
  const [selectedProgressionId, setSelectedProgressionId] = useState<
    string | null
  >(() => getFirstProgressionId("pop", "major"));
  const [activeProgressionStepIndex, setActiveProgressionStepIndex] =
    useState(0);
  const [matchedProgressionStepIndex, setMatchedProgressionStepIndex] =
    useState<number | null>(null);
  const [isProgressionComplete, setIsProgressionComplete] = useState(false);
```

- [ ] **Step 4: Derive resolved progressions and active target**

In `src/App.tsx`, after `compassSuggestions` and `selectedSuggestion`, add:

```ts
  const resolvedProgressions = useMemo(
    () => getResolvedProgressions(progressionGenre, keyMode, progressionKey),
    [keyMode, progressionGenre, progressionKey],
  );
  const selectedProgression = useMemo(
    () =>
      getResolvedProgression(
        progressionGenre,
        keyMode,
        progressionKey,
        selectedProgressionId,
      ) ?? resolvedProgressions[0] ?? null,
    [
      keyMode,
      progressionGenre,
      progressionKey,
      resolvedProgressions,
      selectedProgressionId,
    ],
  );
  const activeProgressionStep =
    selectedProgression?.steps[activeProgressionStepIndex] ?? null;
  const hintedMidiNumbers =
    progressionDisplayMode === "full-progressions"
      ? activeProgressionStep?.target.midiNumbers ?? []
      : selectedSuggestion?.target.midiNumbers ?? [];
```

- [ ] **Step 5: Add progression practice handlers**

In `src/App.tsx`, add callbacks near `handleCompassSuggestionSelect`:

```ts
  const handleProgressionSelect = useCallback((progressionId: string) => {
    setSelectedProgressionId(progressionId);
    setActiveProgressionStepIndex(0);
    setMatchedProgressionStepIndex(null);
    setIsProgressionComplete(false);
  }, []);

  const handleProgressionStepSelect = useCallback((stepIndex: number) => {
    setActiveProgressionStepIndex(stepIndex);
    setMatchedProgressionStepIndex(null);
    setIsProgressionComplete(false);
  }, []);
```

- [ ] **Step 6: Reset full progression state when settings change**

In `src/App.tsx`, add this effect after the existing effect that resets `currentCompassNode` on `keyMode`, `progressionGenre`, and `progressionKey` changes:

```ts
  useEffect(() => {
    setSelectedProgressionId(getFirstProgressionId(progressionGenre, keyMode));
    setActiveProgressionStepIndex(0);
    setMatchedProgressionStepIndex(null);
    setIsProgressionComplete(false);
  }, [keyMode, progressionGenre, progressionKey]);
```

Add this clamp effect after it:

```ts
  useEffect(() => {
    if (
      selectedProgression &&
      activeProgressionStepIndex >= selectedProgression.steps.length
    ) {
      setActiveProgressionStepIndex(0);
    }
  }, [activeProgressionStepIndex, selectedProgression]);
```

- [ ] **Step 7: Render the toggle and conditional panel**

In `src/App.tsx`, after `</section>` for `progression-controls` and before `<ChordReadout ... />`, insert:

```tsx
          <div className="progression-mode-toggle" aria-label="Progression display mode">
            <button
              aria-pressed={progressionDisplayMode === "next-moves"}
              onClick={() => setProgressionDisplayMode("next-moves")}
              type="button"
            >
              Next moves
            </button>
            <button
              aria-pressed={progressionDisplayMode === "full-progressions"}
              onClick={() => setProgressionDisplayMode("full-progressions")}
              type="button"
            >
              Full progressions
            </button>
          </div>
```

Replace the existing unconditional `ProgressionCompass` render with:

```tsx
          {progressionDisplayMode === "next-moves" ? (
            <ProgressionCompass
              currentNode={displayedCompassNode}
              matchedSuggestionId={matchedSuggestionId}
              onSuggestionSelect={handleCompassSuggestionSelect}
              selectedSuggestionId={selectedSuggestion?.id ?? null}
              suggestions={compassSuggestions}
            />
          ) : (
            <ProgressionPracticeRail
              activeStepIndex={activeProgressionStepIndex}
              isComplete={isProgressionComplete}
              matchedStepIndex={matchedProgressionStepIndex}
              onProgressionSelect={handleProgressionSelect}
              onStepSelect={handleProgressionStepSelect}
              progressions={resolvedProgressions}
              selectedProgression={selectedProgression}
            />
          )}
```

Change the `PianoKeyboard` prop from:

```tsx
          hintedMidiNumbers={selectedSuggestion?.target.midiNumbers ?? []}
```

to:

```tsx
          hintedMidiNumbers={hintedMidiNumbers}
```

- [ ] **Step 8: Add mode toggle styles**

In `src/styles.css`, add after `.progression-controls__field select`:

```css
.progression-mode-toggle {
  display: inline-flex;
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  border: 1px solid rgba(243, 245, 241, 0.13);
  border-radius: 0.5rem;
  background: rgba(243, 245, 241, 0.06);
}

.progression-mode-toggle button {
  min-height: 2.5rem;
  border: 0;
  padding: 0 0.875rem;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 750;
}

.progression-mode-toggle button[aria-pressed="true"] {
  background: rgba(242, 184, 75, 0.16);
  color: var(--color-text);
}
```

- [ ] **Step 9: Run the focused app tests**

Run:

```bash
npm test -- src/components/__tests__/App.test.tsx -t "full progressions|piano hint|resets selected full progression"
```

Expected: pass.

- [ ] **Step 10: Commit the app wiring**

Run:

```bash
git add src/App.tsx src/styles.css src/components/__tests__/App.test.tsx
git commit -m "feat: toggle full progression practice mode"
```

## Task 4: Auto-Advance and Completion Loop

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/__tests__/App.test.tsx`

- [ ] **Step 1: Add failing app tests for auto-advance and completion**

Append these tests before the closing `});` in `src/components/__tests__/App.test.tsx`:

```tsx
  it("auto-advances the active full progression step after a matching chord", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));
      expect(screen.getByRole("button", { name: "Step 1: I (C)" })).toHaveAttribute(
        "data-active",
        "true",
      );

      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 1,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
        pointerId: 2,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "C5" }), {
        pointerId: 3,
      });

      expect(screen.getByRole("button", { name: "Step 1: I (C)" })).toHaveAttribute(
        "data-matched",
        "true",
      );

      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.getByRole("button", { name: "Step 2: V7 (G7)" })).toHaveAttribute(
        "data-active",
        "true",
      );
      expect(screen.getByRole("button", { name: "Step 1: I (C)" })).toHaveAttribute(
        "data-matched",
        "false",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not repeatedly advance while the same matching chord remains held", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));
      fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
        pointerId: 1,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 2,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
        pointerId: 3,
      });

      act(() => {
        vi.advanceTimersByTime(650);
      });
      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.getByRole("button", { name: "Step 2: V7 (G7)" })).toHaveAttribute(
        "data-active",
        "true",
      );
      expect(screen.getByRole("button", { name: "Step 3: vi (Am)" })).toHaveAttribute(
        "data-active",
        "false",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks completion after the final full progression step and loops to the first step", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));
      fireEvent.click(screen.getByRole("button", { name: "Step 4: IV (F)" }));

      fireEvent.pointerDown(screen.getByRole("button", { name: "F4" }), {
        pointerId: 1,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "A4" }), {
        pointerId: 2,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "C5" }), {
        pointerId: 3,
      });

      expect(screen.getByText("Progression complete")).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.queryByText("Progression complete")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Step 1: I (C)" })).toHaveAttribute(
        "data-active",
        "true",
      );
    } finally {
      vi.useRealTimers();
    }
  });
```

- [ ] **Step 2: Run the focused app tests to verify they fail**

Run:

```bash
npm test -- src/components/__tests__/App.test.tsx -t "auto-advances|same matching chord|marks completion"
```

Expected: fail because full progression matching effects are not implemented.

- [ ] **Step 3: Import the step matching helper**

In `src/App.tsx`, update the progression library import to include:

```ts
  doesProgressionStepMatchPitchClasses,
```

- [ ] **Step 4: Add repeated-match guard state**

In `src/App.tsx`, near the existing refs, add:

```ts
  const matchedProgressionSignatureRef = useRef<string | null>(null);
```

Add this helper near other local helper functions:

```ts
function pitchClassSignature(pitchClasses: string[]): string {
  return [...pitchClasses].sort().join("|");
}
```

- [ ] **Step 5: Add the auto-advance effect**

In `src/App.tsx`, after the existing compass match effects, add:

```ts
  useEffect(() => {
    if (
      progressionDisplayMode !== "full-progressions" ||
      !selectedProgression ||
      !activeProgressionStep ||
      detection.pitchClasses.length === 0
    ) {
      matchedProgressionSignatureRef.current = null;
      return;
    }

    if (
      !doesProgressionStepMatchPitchClasses(
        activeProgressionStep,
        detection.pitchClasses,
      )
    ) {
      matchedProgressionSignatureRef.current = null;
      return;
    }

    const signature = `${selectedProgression.id}:${activeProgressionStepIndex}:${pitchClassSignature(
      detection.pitchClasses,
    )}`;

    if (matchedProgressionSignatureRef.current === signature) {
      return;
    }

    matchedProgressionSignatureRef.current = signature;
    setMatchedProgressionStepIndex(activeProgressionStepIndex);

    const timeoutId = window.setTimeout(() => {
      const isLastStep =
        activeProgressionStepIndex === selectedProgression.steps.length - 1;

      if (isLastStep) {
        setIsProgressionComplete(true);
        setActiveProgressionStepIndex(0);
      } else {
        setActiveProgressionStepIndex(activeProgressionStepIndex + 1);
      }

      setMatchedProgressionStepIndex(null);
    }, MATCH_CONFIRMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeProgressionStep,
    activeProgressionStepIndex,
    detection.pitchClasses,
    progressionDisplayMode,
    selectedProgression,
  ]);
```

- [ ] **Step 6: Clear completion after looping**

In `src/App.tsx`, add this effect after the auto-advance effect:

```ts
  useEffect(() => {
    if (!isProgressionComplete) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsProgressionComplete(false);
    }, MATCH_CONFIRMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isProgressionComplete]);
```

- [ ] **Step 7: Run the focused app tests**

Run:

```bash
npm test -- src/components/__tests__/App.test.tsx -t "auto-advances|same matching chord|marks completion"
```

Expected: pass.

- [ ] **Step 8: Run all app tests**

Run:

```bash
npm test -- src/components/__tests__/App.test.tsx
```

Expected: pass.

- [ ] **Step 9: Commit auto-advance behavior**

Run:

```bash
git add src/App.tsx src/components/__tests__/App.test.tsx
git commit -m "feat: auto-advance full progression practice"
```

## Task 5: Polish, Accessibility, and Verification

**Files:**
- Modify only files needed to fix failures found by verification.

- [ ] **Step 1: Run the full verification suite**

Run:

```bash
make verify
```

Expected: tests, TypeScript lint, and production build pass.

- [ ] **Step 2: If TypeScript reports unstable memo dependencies, stabilize them**

If `selectedProgression` memoization complains because `resolvedProgressions` changes identity too often, keep the current logic but move the fallback into a direct memo that depends on primitive settings:

```ts
  const selectedProgression = useMemo(() => {
    const selected = getResolvedProgression(
      progressionGenre,
      keyMode,
      progressionKey,
      selectedProgressionId,
    );

    if (selected) {
      return selected;
    }

    return resolvedProgressions[0] ?? null;
  }, [
    keyMode,
    progressionGenre,
    progressionKey,
    resolvedProgressions,
    selectedProgressionId,
  ]);
```

Run:

```bash
make lint
```

Expected: pass.

- [ ] **Step 3: If tests show progression content mismatches, update tests to match validated curated data**

Use the actual `getResolvedProgressions("pop", "major", "C")` output as the source of truth. Keep at least these assertions in app tests:

```tsx
expect(
  screen.getByRole("region", { name: "Full progressions" }),
).toBeInTheDocument();
expect(screen.getByRole("button", { name: "Axis Progression" })).toHaveAttribute(
  "aria-pressed",
  "true",
);
expect(screen.getByRole("button", { name: "Step 1: I (C)" })).toHaveAttribute(
  "data-active",
  "true",
);
```

Run:

```bash
npm test -- src/music/__tests__/progressionLibrary.test.ts src/components/__tests__/ProgressionPracticeRail.test.tsx src/components/__tests__/App.test.tsx
```

Expected: pass.

- [ ] **Step 4: Start the development server for manual UI verification**

Run:

```bash
make dev
```

Expected: Vite prints a local URL such as `http://localhost:5173/`.

- [ ] **Step 5: Manually verify the user-visible workflow**

Open the Vite URL and check:

- `Next moves` is selected by default and the current compass still works.
- `Full progressions` shows curated progression cards and the practice rail.
- The rail shows keys for every chord separately.
- Clicking a rail step changes the keyboard hint.
- Playing the active chord advances one step.
- Matching the last chord shows completion and loops to step 1.
- Changing genre, key, or mode resets the selected progression and active step.
- At mobile width, the progression list stacks above the rail and no text overlaps.

- [ ] **Step 6: Stop the development server**

Stop the `make dev` process with `Ctrl-C`.

- [ ] **Step 7: Run final verification**

Run:

```bash
make verify
```

Expected: pass.

- [ ] **Step 8: Commit verification fixes**

If Step 1 through Step 7 required code or test changes, commit them:

```bash
git add src/App.tsx src/styles.css src/music/progressionLibrary.ts src/music/types.ts src/music/__tests__/progressionLibrary.test.ts src/components/ProgressionPracticeRail.tsx src/components/__tests__/ProgressionPracticeRail.test.tsx src/components/__tests__/App.test.tsx
git commit -m "fix: polish full progression practice mode"
```

If there were no changes after Task 4, skip this commit.

## Self-Review

Spec coverage:

- Toggle between `Next moves` and `Full progressions`: Task 3.
- Curated-only complete progressions: Task 1.
- Right-side practice rail with every chord key hint: Task 2 and Task 3.
- Active step drives keyboard hints: Task 3.
- Manual step selection: Task 2 and Task 3.
- Auto-advance on correct chord: Task 4.
- Completion loop after final chord: Task 4.
- Reset on genre, key, and mode changes: Task 3.
- Empty and validation behavior: Task 1 and Task 2.
- Tests and manual verification: Tasks 1 through 5.

Placeholder scan:

- The plan contains no unresolved marker words.
- Any conditional repair step includes exact code and exact commands.

Type consistency:

- `ProgressionDisplayMode`, `CuratedProgression`, `ResolvedProgressionStep`, and `ResolvedProgression` are defined in Task 1 and used consistently in later tasks.
- `ProgressionPracticeRail` props are defined in Task 2 and match `App.tsx` usage in Task 3.
- The matching helper is named `doesProgressionStepMatchPitchClasses` in Task 1 and Task 4.
