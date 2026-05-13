# Scale Learning Design

## Status

Approved for specification on 2026-05-13.

## Context

Progresifo currently has two learning workspaces: progressions and chord
construction. The next addition is a fundamental scale-learning workspace for
users who want to learn which notes belong to common scales such as major,
minor, pentatonic, blues, modes, and jazz-oriented symmetric scales.

This feature should focus on scale membership and practice validation, not on
advanced chord-scale compatibility. The user should still be able to see and use
the existing full piano while learning scales.

## Goals

- Add a third top-level workspace tab named `Scales`.
- Let users choose a root and a scale type.
- Show the notes used by the selected scale.
- Show the selected scale on a compact piano-key map.
- Show music staff notation for all notes required by the selected scale.
- Keep the shared full piano visible and highlight the selected scale notes.
- Validate user practice input from pointer or MIDI.
- Keep scale practice isolated from progression trail and compass behavior.

## Non-Goals

- Do not teach chord-scale compatibility in this version.
- Do not generate chords from scale degrees in this version.
- Do not add route-level navigation or persistence.
- Do not add step-by-step lesson sequencing.
- Do not change existing progression or chord-construction behavior.

## User Flow

The top-level workspace switcher gains a third tab:

- `Progressions`
- `Chord Construction`
- `Scales`

In `Scales`, the user chooses a root and scale type. The workspace then shows:

- the scale name, such as `C major` or `A minor pentatonic`;
- a clear note list, such as `C D E F G A B`;
- the scale formula or interval pattern;
- a short description and common-use text;
- a compact piano map with scale tones highlighted;
- a staff notation view containing the required notes;
- practice status that changes to matched when the user plays the exact scale
  pitch-class set.

The full piano remains below the workspace. Its highlighted notes come from the
selected scale while the user is in the scale workspace.

## Scale Catalog

Add a curated scale catalog under `src/music`, separate from chord construction
and progression logic. The catalog should be app-owned so the UI can use
learner-facing names, descriptions, and genre notes.

Each scale type should include:

- `id`: stable identifier, such as `major`, `minor-pentatonic`, or
  `whole-tone`.
- `family`: a grouping such as `core`, `pentatonic-blues`, `modes`, or
  `symmetric`.
- `name`: readable label, such as `Major` or `Minor pentatonic`.
- `intervals`: semitone offsets from root.
- `formula`: learner-facing scale degrees, such as `1 2 3 4 5 6 7`.
- `steps`: interval steps between adjacent scale notes, such as
  `W W H W W W H`.
- `description`: how the scale is built.
- `usage`: where the scale commonly appears.
- `genres`: practical tags such as pop, classical, jazz, blues, funk, rock, or
  film.

Initial catalog:

- Major.
- Natural minor.
- Harmonic minor.
- Melodic minor.
- Major pentatonic.
- Minor pentatonic.
- Blues.
- Dorian.
- Phrygian.
- Lydian.
- Mixolydian.
- Locrian.
- Whole tone.
- Diminished whole-half.
- Diminished half-whole.

## Music Helpers

Add helper functions in a new scale module for:

- returning scale types in family order;
- finding a scale type by ID;
- building display note names for a root and scale type;
- building normalized pitch classes for validation;
- building target MIDI representatives for piano highlighting within the active
  piano range;
- validating exact pitch-class matches from active notes against a selected
  scale;
- generating staff notation data from the selected scale target.

Scale note display should use conventional learner-friendly spelling whenever
possible. For example, Bb major should display `Bb C D Eb F G A`, not
`A# C D D# F G A`. Validation can still normalize enharmonic pitch classes
internally so MIDI and piano input remain reliable.

Pitch-class matching should be exact and octave-independent. For example, C
major is matched when the active pitch classes are exactly `C D E F G A B`,
regardless of octave. Missing notes or extra outside pitch classes keep the
scale unmatched.

## UI Components

Use the approved `Reference + Practice Panel` direction.

Add these components:

- `ScaleLearningPanel`: owns selected root, scale type, selected target, and
  validation display.
- `ScaleTypeList`: renders the grouped scale catalog.
- `ScaleTypeDetail`: renders note list, formula, step pattern, description,
  usage, genre tags, compact piano map, and match status.
- `ScaleStaff`: renders staff notation for the selected scale notes.
- `MiniPianoMap`: renders a compact non-interactive piano strip for the scale
  detail panel.

`WorkspaceTabs` should include the new `Scales` tab and preserve roving keyboard
navigation across all three tabs.

## Data Flow

`App` keeps ownership of global concerns: active notes, audio, MIDI, current
global key, piano range, interaction mode, and the shared piano.

The scale workspace derives:

- local scale root;
- selected scale type;
- selected pitch classes;
- selected MIDI representatives for piano hints;
- exact match status from current active pitch classes.

`PianoKeyboard` receives `hintedMidiNumbers` from the active workspace. When the
user is in `Scales`, those hints come from the selected scale instead of
progression suggestions or chord-construction targets.

Progression detection effects should continue to ignore notes played while the
active workspace is not `progressions`.

## Staff Notation

The staff notation should be a simple, readable visual for the selected scale's
required notes. It does not need playback, rhythm, measures, or a full notation
engine in the first version.

Prefer an app-owned SVG or lightweight React rendering that can be tested with
accessible labels. Notes should be displayed in ascending order from the chosen
root, using the same pitch-class spelling produced by the scale helper.

## Error Handling

Invalid catalog entries should fail loudly in tests and development. The UI
should not expose invalid scale definitions.

If a selected scale cannot be voiced inside the active piano range, helper
functions should throw a clear error. The chosen initial catalog should fit the
current desktop and mobile piano ranges.

If active notes contain unknown pitch classes, validation should return
unmatched rather than throwing in the UI path.

## Testing

Add music-helper tests for:

- scale catalog integrity and unique IDs;
- family ordering;
- representative scale note generation;
- conventional flat-root spelling for display;
- enharmonic normalization for validation;
- target MIDI generation inside the active piano range;
- exact pitch-class validation independent of octave;
- rejection of missing notes and outside notes.

Add component tests for:

- `Scales` tab appears and has accessible tab-panel wiring;
- roving keyboard navigation works across three workspace tabs;
- default scale details render with note list, formula, compact piano map, staff
  notation, and practice status;
- selecting scale type updates details and piano hints;
- selecting root updates scale notes and staff notation;
- pointer/MIDI input validates the selected scale;
- scale practice notes do not update progression trail or compass context.

## Verification

Run `make verify`.

Manually check the app in the browser after implementation:

- Progression workspace still behaves as before.
- Chord construction workspace still behaves as before.
- Scale workspace opens from the new top-level tab.
- Scale notes, compact piano map, staff notation, and shared piano hints agree.
- Pointer and MIDI input can satisfy the selected scale target.
- Extra outside notes keep the scale unmatched.
