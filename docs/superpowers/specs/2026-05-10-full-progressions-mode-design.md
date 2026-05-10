# Full Progressions Mode Design

## Status

Approved for specification on 2026-05-10.

## Context

Progresifo currently has a progression compass that reacts to the current or
recently pressed graph node. It shows starter ideas when no node is active and
then shows curated next moves from the active node. That interaction is useful
for exploration, but it does not show complete chord progressions a learner can
practice from start to finish.

The new mode should sit beside the current compass behavior. It should use the
same selected genre, key, and major/minor mode, but show curated complete
progressions with concrete chord labels and key hints for each chord.

## Goals

- Add a toggle between the existing `Next moves` behavior and a new
  `Full progressions` mode.
- Keep curated content as the source of truth. Do not generate arbitrary graph
  paths for v1.
- Show multiple complete progressions for the selected genre and key mode.
- Render each progression as Roman numerals plus concrete chord names, for
  example `I (C) - V (G) - vi (Am) - IV (F)`.
- Show a right-side practice rail for the selected progression.
- Show each chord in the selected progression separately with the keys to
  press, for example `I (C): C E G`.
- Use the active practice step as the piano keyboard hint.
- Let users manually choose any step in the practice rail.
- Auto-advance the active step when the user plays the correct chord.
- After the last chord is matched, briefly mark the progression complete and
  then loop back to the first step.

## Non-Goals

- No generated enumeration of all possible graph paths.
- No scoring, timing, metronome, or rhythm system in this version.
- No persistence for selected progression or completed progressions.
- No requirement that users play the exact displayed octave or inversion.
- No changes to MIDI ownership behavior or pointer note ownership behavior.
- No replacement of the existing `Next moves` compass mode.

## Product Approach

Add a compact display mode toggle near the existing progression controls:

```text
Next moves | Full progressions
```

`Next moves` preserves the current compass. `Full progressions` swaps the
compass content for a curated progression browser and practice rail.

The first version uses explicit curated progression sets per genre and key
mode. A progression is an ordered list of graph node IDs, plus a stable ID and
display name. The node IDs are resolved through the existing progression graph
utilities so labels, transposition, target voicings, and matching behavior stay
consistent with the current compass.

Example data shape:

```ts
{
  id: "pop-axis",
  name: "Axis Progression",
  nodeIds: ["I", "V7", "vi", "IV"]
}
```

The data will live in a new music-domain module, such as
`src/music/progressionLibrary.ts`, rather than being embedded in React
components.

## User Flow

The user chooses genre, key, and major/minor mode using the existing controls.
They then switch from `Next moves` to `Full progressions`.

In `Full progressions` mode:

1. The app selects the first curated progression by default.
2. The left side lists available progressions for the selected genre and mode.
3. Each progression card shows its name and full sequence, such as
   `I (C) - V (G) - vi (Am) - IV (F)`.
4. Selecting a progression resets the active step to the first chord.
5. The right-side practice rail shows every chord in the selected progression.
6. Each rail step shows the chord label and concrete keys to press.
7. The active rail step controls the piano keyboard hint.
8. Clicking a rail step makes that step active.
9. Playing the correct chord marks that step matched and advances to the next
   step after a short confirmation.
10. Matching the last step briefly marks the progression complete, then loops
    back to step 1 of the same selected progression.

`Full progressions` mode ignores the current/recent compass node. It is driven
by the selected progression and active rail step, not by the graph node the user
most recently played.

## UI Design

Use a two-column layout inside the progression panel on desktop and wide
tablet screens.

Left column:

- Mode toggle.
- Curated progression cards.
- Each card shows progression name, full Roman numeral and chord sequence, and
  optionally a short genre note.

Right column:

- Practice rail for the selected progression.
- One row per chord.
- Each row shows step number, chord label, and note names.
- Active step has the strongest accent.
- Recently matched step has a brief success state.
- Completed progression has a brief complete state before looping.

On narrow screens, stack the progression list and practice rail vertically.
Keep the practice rail close to the piano because it controls keyboard hints.
Only the active step should hint keys on the piano, even though all chord keys
are visible in the rail.

The layout direction selected during brainstorming is the practice rail pattern:
the user can always see all chord keys, while the active step makes it clear
what to press now.

## Data Model

Add domain types similar to:

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

The resolver should accept genre, key mode, key root, and progression ID or
definition. It should return a resolved progression whose step targets can be
used directly by the piano hint and chord matching logic.

Invalid node IDs in curated progression data should fail loudly in tests and
development. They should not silently disappear from the UI.

## State Model

`App.tsx` should own the display mode and practice state:

- `progressionDisplayMode`: `next-moves` or `full-progressions`.
- `selectedProgressionId`.
- `activeProgressionStepIndex`.
- `matchedProgressionStepIndex`.
- Short-lived `isProgressionComplete` state or equivalent completion marker.

When genre, key, or key mode changes:

- Preserve the selected display mode.
- Reset selected progression to the first available progression for the new
  genre/mode.
- Reset active step to 0.
- Clear matched and complete state.

When switching into `Full progressions`:

- Select the first available progression if none is currently selected.
- Set active step to 0.

When switching back to `Next moves`:

- Preserve existing compass behavior.
- Do not add selected full progression steps to the recent progression trail.

## Matching and Advancement

The active practice step has a target voicing and target pitch classes. The
keyboard hint uses the target MIDI numbers. Matching uses the same pitch-class
identity rules as the current compass suggestions so inversions and octave
changes are accepted.

When the detected chord matches the active step:

1. Set the matched step state.
2. Wait for the same confirmation duration used by the existing compass match
   feedback. If the constant is currently local to `App.tsx`, extract a shared
   constant so both modes use the same timing.
3. If the matched step is not the last step, advance to the next step.
4. If the matched step is the last step, mark the progression complete briefly,
   then reset active step to 0.

The matching effect should guard against repeated advancement from the same
held chord. It should advance once per detected matching chord state rather
than looping continuously while the notes remain held.

## Empty and Error States

If a genre/mode has no curated full progressions, show an empty state in
`Full progressions` mode and keep the keyboard hint empty. This should not
affect `Next moves` mode.

If a curated progression references an unknown graph node, the resolver should
throw. Tests should cover curated data validity so broken content is caught
before runtime.

If a target note is outside the visible keyboard range, the practice rail still
shows the note names. The keyboard hint only marks visible keys.

## Testing Strategy

Add music-domain tests for:

- Resolving curated progressions for genre, key mode, and key root.
- Transposed display sequences.
- Per-step target note names, MIDI numbers, and pitch classes.
- Validation that curated progression node IDs exist in the selected graph.
- Matching active steps across inversions and octaves.

Add component or app tests for:

- Toggling between `Next moves` and `Full progressions`.
- Rendering curated progression cards for the selected genre/mode.
- Selecting a progression updates the right-side practice rail.
- Clicking a rail step updates the active keyboard hint.
- Playing the correct active chord advances one step.
- Matching the final step shows completion and loops to the first step.
- Changing genre, key, or mode resets selected progression and active step.
- Full progression selections do not add entries to the recent progression
  trail until chords are actually played.

Manual verification should include:

- Practicing at least one full progression in a major key and one in a minor
  key.
- Confirming pointer and MIDI input both advance the practice rail.
- Confirming held notes do not repeatedly advance through multiple steps.
- Checking the stacked layout on mobile width.

## Future Extensions

- Add rhythm patterns or metronome-guided practice.
- Add progression categories such as beginner, turnaround, cadence, and color.
- Allow users to favorite or pin progressions locally.
- Add a filter for basic, colorful, or advanced progressions.
- Add a "why this progression works" explanation for selected progressions.
