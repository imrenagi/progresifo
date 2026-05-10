# Chord Construction Design

## Status

Approved for specification on 2026-05-10.

## Context

Progresifo currently helps users detect played chords and practice chord
progressions. The user wants another UI tab for learning how chords are
constructed. The tab should explain common chord variations, show how to build
them, provide examples from the active scale, and let users try the chord on
the existing piano with pointer or MIDI input.

## Goals

- Add a top-level `Chord Construction` workspace beside the existing
  progression workspace.
- Provide a curated chord dictionary grouped by family.
- Explain each chord type in beginner-friendly language.
- Show both scale-native examples and useful color examples on active scale
  roots.
- Reuse existing pointer, MIDI, audio, active-note, and piano highlighting
  behavior.
- Validate when the user plays the selected target chord.
- Keep progression-specific controls out of the chord construction workspace.

## Non-Goals

- Do not build a full guided lesson sequence in this version.
- Do not expose every chord type from `tonal`.
- Do not add route-level navigation or persistence.
- Do not change progression practice behavior.
- Do not make chord construction override changes mutate progression settings
  unless the user changes shared app-level controls.

## User Flow

Add a top-level workspace switcher with two tabs: `Progressions` and
`Chord Construction`.

In `Progressions`, the current app remains essentially as-is: genre, key, mode,
chord readout, next moves, full progressions, progression trail, and piano.

In `Chord Construction`, the readout area becomes a dedicated chord-learning
workspace:

- Root and scale controls default from the app's current key and mode.
- The chord tab allows local root and mode overrides.
- A left family list groups chord types.
- A right detail panel shows the selected chord type, construction details,
  usage, feeling, examples, target notes, and match status.
- The existing piano remains active.
- Selecting an example updates the target notes and highlights them on the
  piano.
- Playing the exact target pitch classes by pointer or MIDI marks the chord as
  matched.

## Chord Catalog

Add a new chord construction module under `src/music`, separate from
progression graph logic. The catalog should be curated and app-owned so the UI
can use clear learner-facing language instead of raw library metadata.

Each chord type should include:

- `id`: stable identifier, such as `major`, `minor`, `dominant-7`, or
  `altered-7-sharp-9`.
- `family`: `triads`, `suspended-add`, `sixths`, `sevenths`, `extended`, or
  `altered`.
- `symbol`: learner-facing suffix, such as `m`, `dim`, `sus4`, `maj7`, or
  `7#9`.
- `name`: readable label, such as `Dominant seventh`.
- `intervals`: semitone offsets from root.
- `formula`: interval names, such as `1 3 5 b7`.
- `description`: how the chord is constructed.
- `usage`: when the variation commonly appears.
- `feeling`: practical character words such as bright, tense, floating,
  resolved, bluesy, jazzy, dreamy, dark, or spicy.
- `commonFunctions`: optional tags such as tonic, predominant, dominant,
  passing, color, or substitution.
- `examples`: short contextual examples, such as `G7 -> C`,
  `Dm7 -> G7 -> Cmaj7`, or `Csus4 -> C`.

The initial catalog should include:

- Major, minor, diminished, augmented.
- Sus2, sus4, add9.
- 6, m6.
- 7, maj7, m7, m7b5, dim7.
- 9, maj9, m9, 11, 13.
- 7b9, 7#9, 7b5, 7#5.

## Music Helpers

Add helper functions in `src/music/chordConstruction.ts` for:

- Building target pitch classes and target piano voicings for a root and chord
  type.
- Building active scale pitch classes from a root and mode.
- Generating `In this scale` examples where every chord tone is contained in
  the active scale.
- Generating `Try on scale roots` examples by applying the selected chord type
  to each scale degree, even if some chord tones borrow notes outside the
  active scale.
- Validating exact pitch-class matches from current active notes against the
  selected target.

Use `tonal` for note and chroma normalization where useful. Keep formulas,
families, descriptions, usage, and feeling text in Progresifo's own catalog.

## UI Components

Add these components:

- `WorkspaceTabs`: switches between `Progressions` and `Chord Construction`.
- `ChordConstructionPanel`: owns selected family, chord type, local root/mode
  overrides, and selected example state.
- `ChordTypeList`: renders the grouped family list.
- `ChordTypeDetail`: renders formula, construction description, usage,
  feeling, contextual examples, target notes, and match status.
- `ChordExampleList`: renders `In this scale` and `Try on scale roots`
  examples.

The chord construction workspace should use the chosen family-list layout. It
should feel like a focused learning tool rather than another progression
browser. The progression trail should be hidden in this workspace.

## Data Flow

`App` keeps ownership of existing global concerns: active notes, audio, MIDI,
current key, key mode, piano range, and piano interaction mode.

The active workspace determines which readout panel appears. Progression state
continues to drive the progression workspace. Chord construction state drives
only the chord construction workspace.

The chord workspace derives:

- active scale root and mode from local overrides or the app defaults;
- selected chord type from the catalog;
- selected target root from the active root or selected example;
- target pitch classes and voicing from the selected root and chord type;
- match status from current active pitch classes.

`PianoKeyboard` receives `hintedMidiNumbers` from the active workspace. When
the user is in chord construction, those hints come from the selected target
chord instead of progression suggestions.

## Error Handling

Unsupported roots or invalid chord definitions should fail loudly in music
helper tests and development. The UI should not expose invalid catalog entries.

If no scale-native examples exist for a selected chord type, the `In this
scale` section should show a short empty state while the `Try on scale roots`
section remains available.

If the user plays extra notes or omits a target note, the match state remains
unmatched. Matching is pitch-class based, so octave choices do not matter.

## Testing

Add music-helper tests for:

- catalog integrity and unique IDs;
- target pitch-class generation for representative chord types;
- target voicing generation;
- scale-native example filtering;
- color examples on scale roots;
- exact pitch-class match validation.

Add component tests for:

- switching between progression and chord construction workspaces;
- selecting chord families and chord types;
- selecting examples and updating target notes;
- showing construction, usage, and feeling content;
- showing matched state when active notes match the selected chord.

## Verification

Run `make verify`.

Manually check the app in the browser after implementation:

- The progression workspace still behaves as before.
- The chord construction workspace opens from the new top-level tab.
- Chord families and detail content render clearly on desktop and mobile.
- Selecting chord examples updates piano hints.
- Pointer and MIDI input can satisfy the selected chord target.
