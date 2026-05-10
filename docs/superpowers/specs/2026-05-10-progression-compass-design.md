# Progression Compass Design

## Status

Approved for specification on 2026-05-10.

## Context

Progresifo already detects live piano chords, shows current notes, keeps a
recent progression trail, supports optional Tone.js playback, and accepts
pointer and Web MIDI input. The next learning layer should help a user answer:
"I played this chord. What can I play next in this genre?"

The feature should stay inside the current practice surface. It should not turn
the app into a static lesson page or a recipe-only progression browser.

## Goals

- Let the user choose a genre and key before exploring progressions.
- Support these v1 genres: pop, jazz, blues, classical, gospel, and neo-soul.
- Support major and minor keys.
- Show suggestions as both Roman numerals and concrete chord names, such as
  `IVmaj7 (Fmaj7)`.
- Provide a curated, genre-aware map of likely next chords.
- Show a beginner-friendly fingering for the selected suggestion.
- Accept correct chord identity across inversions and octaves.
- Advance the compass after the user plays a matching suggested chord.
- Include richer chord qualities where musically useful, including suspended
  `sus2` and `sus4`, diminished, augmented, seventh, major seventh, minor
  seventh, and half-diminished chords.
- Label suggestions by difficulty and musical function so harder chords are
  discoverable without feeling arbitrary.

## Non-Goals

- No automatic key inference in v1. The user chooses the key first.
- No generated theory engine that tries to enumerate every possible chord.
- No scoring system, accounts, saved lessons, or cloud persistence.
- No requirement that users play the exact displayed octave or inversion.
- No MIDI output to external devices.

## Product Approach

Use a curated progression graph for v1.

Each genre defines a set of chord-role nodes and directed next moves. A node can
represent a simple diatonic chord like `I`, a richer quality like `Imaj7`, or a
color/passing option like `V7sus4`, `#io`, `viio7`, `bVII`, or `iim7b5`,
depending on the genre and key mode.

Each next move includes:

- Roman numeral.
- Chord quality.
- Concrete chord name after transposition into the selected key.
- Difficulty: `basic`, `colorful`, or `advanced`.
- Function label: `common`, `smooth`, `tension`, `spicy`, or `resolve`.
- Suggested beginner voicing as concrete key names and MIDI numbers.
- Match pitch classes used for flexible validation.
- Short explanation of why the move works.

This approach is intentionally finite and teachable. It favors reliable,
genre-specific guidance over exhaustive theory generation.

## User Flow

The first screen remains the working practice surface.

At the top, add compact controls for genre and key. The default experience can
start with a practical key such as C major and a commonly useful genre, but the
controls must make the current choices explicit.

Before the user has an active compass node, show starter ideas for the selected
genre and key. A starter idea is a playable chord that can begin exploration,
for example:

- `I (C)` as a stable home chord.
- `vi (Am)` as a common pop color.
- `ii7 (Dm7)` as a smooth jazz or gospel setup.

When the user selects a starter idea or plays a recognized chord that exists in
the current graph, the compass enters active mode:

1. Show "You are here" with the current Roman numeral and concrete chord.
2. Show the primary recommended next move by default.
3. Show the other next moves as selectable cards.
4. Highlight the piano keys for the selected target voicing.
5. If the user selects another suggestion, update the highlighted target keys.
6. When the user plays a matching chord, briefly mark that suggestion as
   matched.
7. After the brief confirmation, advance the compass to the matched chord and
   show its next possible moves.

The recent progression trail continues to record only detected chords the user
actually played. Selecting a suggestion does not add it to the trail.

## Chord Matching

The displayed voicing gives the user concrete keys to press, but matching is
based on chord identity rather than exact keyboard position.

For example, if the selected suggestion is `IV (F)` in C major, the app may
highlight `F3 A3 C4` as an easy voicing. The user can still satisfy the target
by playing another inversion or octave such as `A3 C4 F4`, as long as the
active pitch classes match the target chord identity.

Validation should be strict enough to avoid accidental matches, but forgiving
enough for natural piano playing. The first implementation can compare required
pitch classes for the selected target and ignore octave. More nuanced handling
for extensions or omitted tones can be added later if needed.

## UI Placement

On desktop and tablet layouts, place the Progression Compass directly under the
current chord readout. This keeps the suggestions visually tied to the chord the
user just played.

The main practice stack becomes:

1. Current chord readout.
2. Progression Compass.
3. Recent progression trail.
4. Piano keyboard.

On mobile, keep the compass compact and close to the piano. Suggestion cards may
scroll horizontally if needed. Only the selected target's keys should be hinted
on the piano at once to avoid visual clutter.

Suggestion cards should be optimized for scanning:

- Main label: `IVmaj7 (Fmaj7)`.
- Function label, such as `Smooth`.
- Difficulty, such as `Colorful`.
- Key prompt, such as `Press F A C E`.
- One short reason.

The selected card receives a stronger accent. A matched card briefly changes
state before the next compass node appears.

## Technical Design

Keep progression intelligence in the music domain layer and make the UI consume
structured data.

Add music-domain modules:

- `src/music/progressionGraph.ts` for curated genre graph definitions.
- `src/music/progressionCompass.ts` for graph lookup, key transposition,
  primary suggestion selection, target voicing calculation, and match helpers.

Add or extend types for:

- `ProgressionGenre`.
- `KeyMode`.
- `ProgressionGraphNode`.
- `ProgressionSuggestion`.
- `SuggestionDifficulty`.
- `SuggestionFunction`.
- `CompassState`.
- `TargetVoicing`.

Add UI components and integration:

- `src/components/ProgressionCompass.tsx` renders starter ideas, the active
  node, suggestion cards, selected target details, and matched state.
- `src/App.tsx` owns selected genre, selected key, active compass node, selected
  suggestion, and short-lived matched suggestion state.
- `src/components/PianoKeyboard.tsx` accepts optional hinted MIDI numbers or
  pitch classes and renders them distinctly from active pressed notes.

The existing chord detector should remain the source of truth for what the user
played. The compass consumes detected chords and maps them to graph nodes for
the selected key and genre.

## Data Strategy

Start with a small but useful graph per genre rather than trying to cover every
possible style variation.

Each genre should include:

- A few starter nodes.
- Common diatonic moves.
- At least some richer quality options where the genre calls for them.
- Clear labels for basic, colorful, and advanced suggestions.

The graph format should be plain TypeScript data so it is easy to review,
extend, and test. Avoid embedding logic inside the data definitions beyond
stable identifiers and metadata.

## Error and Empty States

If the user plays a detected chord that is not represented in the selected
genre graph, keep the detected chord visible and show a compass empty state such
as "No curated moves for this chord in this genre yet." The user can still
select a starter idea or choose another genre/key.

If a selected target cannot be voiced in the current visible mobile piano range,
the app should still show the target card and concrete chord tones. The piano
hint can show only visible matching keys until a broader range control exists.

If no chord is active and no starter is selected, the compass shows starter
ideas for the selected genre/key.

## Testing Strategy

Add unit tests for music-domain behavior:

- Graph lookup by genre, key, and mode.
- Transposition from Roman numeral/chord role into concrete chord names.
- Suggested voicing generation for major and minor keys.
- Support for suspended, diminished, augmented, seventh, major seventh, minor
  seventh, and half-diminished qualities where present in graph data.
- Flexible matching across inversions and octaves.
- Non-match behavior for incomplete or wrong pitch-class sets.

Add component tests for user-visible workflows:

- Selecting genre and key updates starter ideas.
- Selecting a suggestion highlights its target keys on the piano.
- Playing a matching inversion confirms the suggestion.
- Confirmation advances the compass to the next node.
- Selecting a suggestion does not add it to the recent progression trail until
  the chord is actually played.

Manual verification should include:

- Playing through at least one path in each v1 genre.
- Testing major and minor keys.
- Confirming MIDI-owned notes and pointer-owned notes continue to behave
  independently.
- Checking mobile layout so suggestion cards and key hints do not crowd the
  piano.

## Future Extensions

- Infer key from recent played chords after the user has enough context.
- Add complete progression recipes as optional starter paths.
- Add a color-chord filter if users want to hide advanced suggestions.
- Add explanations that compare the same Roman numeral across multiple keys.
- Persist favorite progression paths locally.
