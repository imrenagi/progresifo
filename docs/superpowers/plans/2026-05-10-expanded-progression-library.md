# Expanded Progression Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand Full Progressions mode with a larger curated library for every existing genre and major/minor mode.

**Architecture:** Keep the change in the existing music-domain library. Add only curated `CuratedProgression` entries and strengthen tests that validate count, uniqueness, and graph-node correctness.

**Tech Stack:** TypeScript, Vitest, React app verification through existing `make verify`.

---

## Task 1: Expand Curated Progression Data

**Files:**
- Modify: `src/music/progressionLibrary.ts`
- Modify: `src/music/__tests__/progressionLibrary.test.ts`

- [ ] **Step 1: Add failing coverage for larger library**

Add tests to `src/music/__tests__/progressionLibrary.test.ts`:

```ts
import { PROGRESSION_GENRES } from "../progressionGraph";
import type { KeyMode } from "../types";
```

Add these tests inside `describe("progressionLibrary", () => { ... })`:

```ts
  it("provides a larger curated library for every genre and mode", () => {
    const modes: KeyMode[] = ["major", "minor"];

    PROGRESSION_GENRES.forEach((genre) => {
      modes.forEach((mode) => {
        expect(
          getResolvedProgressions(genre, mode, "C"),
          `${genre} ${mode}`,
        ).toHaveLength(6);
      });
    });
  });

  it("keeps curated progression ids and sequences unique per genre and mode", () => {
    const modes: KeyMode[] = ["major", "minor"];

    PROGRESSION_GENRES.forEach((genre) => {
      modes.forEach((mode) => {
        const progressions = getResolvedProgressions(genre, mode, "C");
        const ids = progressions.map((progression) => progression.id);
        const sequences = progressions.map((progression) =>
          progression.steps.map((step) => step.nodeId).join(" "),
        );

        expect(new Set(ids).size, `${genre} ${mode} ids`).toBe(ids.length);
        expect(new Set(sequences).size, `${genre} ${mode} sequences`).toBe(
          sequences.length,
        );
      });
    });
  });
```

- [ ] **Step 2: Run the domain tests and confirm failure**

Run:

```bash
npm test -- src/music/__tests__/progressionLibrary.test.ts
```

Expected: fail because several genre/mode buckets currently have fewer than six progressions.

- [ ] **Step 3: Expand `curatedProgressions`**

In `src/music/progressionLibrary.ts`, add entries until every genre/mode bucket has exactly six unique progressions. Use only node IDs already present in `src/music/progressionGraph.ts`. Preserve existing first entries and existing IDs.

Use concise names and descriptions. Prefer common patterns: pop rotations, jazz ii-V-I/turnarounds/tritone substitutions, blues dominant and minor forms, classical cadences/circle/deceptive motion, gospel suspended/secondary-dominant motion, and neo-soul extended-color loops.

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- src/music/__tests__/progressionLibrary.test.ts
```

Expected: all progression library tests pass.

- [ ] **Step 5: Run full verification**

Run:

```bash
make verify
```

Expected: tests, typecheck, and production build pass.

- [ ] **Step 6: Browser spot-check**

Run or reuse the dev server and check `Full progressions` for at least Pop major and Blues minor. Confirm the larger lists render and progression selection still updates the rail.

- [ ] **Step 7: Commit**

Run:

```bash
git add src/music/progressionLibrary.ts src/music/__tests__/progressionLibrary.test.ts docs/superpowers/plans/2026-05-10-expanded-progression-library.md
git commit -m "feat: expand curated progression library"
```

## Self-Review

- Spec coverage: larger curated library, existing graph nodes only, validation, uniqueness, and verification are covered.
- Placeholder scan: no unresolved placeholders.
- Type consistency: tests use existing `ProgressionGenre`, `KeyMode`, and resolver APIs.
