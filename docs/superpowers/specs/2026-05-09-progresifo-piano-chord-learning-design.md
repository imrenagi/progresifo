# Progresifo Piano Chord Learning Design

## Status

Approved for planning on 2026-05-09.

## Context

Progresifo is a greenfield web app for learning music through piano keys,
chords, and chord progressions. The first version should give immediate visual
feedback when the user plays notes either on-screen or from a USB MIDI
controller.

The local repository currently has no committed application code. A Google
Stitch project was created for the design work:
`projects/17634580311564321528`, titled `progresifo`. A first-pass design brief
was uploaded to Stitch as screen instance `11508608841322822099`.

## Goals

- Show an interactive piano keyboard as the first screen of the app.
- Highlight keys pressed by mouse, touch, or a connected USB MIDI controller.
- Show the current pressed notes and detected chord in a central readout.
- Keep a compact recent progression trail of detected chords.
- Provide optional browser sound playback behind an explicit sound toggle.
- Use current React, Vite, and Tailwind CSS v4 tooling.
- Keep the first version focused enough to learn from and extend.

## Non-Goals

- No user accounts, cloud persistence, sharing, or backend service.
- No full curriculum, exercises, scoring, or spaced repetition in v1.
- No sheet music rendering in v1.
- No MIDI output to external devices in v1.
- No Safari-specific plugin workaround for Web MIDI in v1.

## Technical Decisions

Use React `19.2.6`, Vite `8.0.11`, Tailwind CSS `4.3.0`, and
`@tailwindcss/vite` `4.3.0`. Use TypeScript because MIDI and music-domain state
benefit from explicit event and note types.

Use `tonal` `6.4.3` for note conversion and chord detection. It provides music
theory primitives for MIDI note names, pitch classes, and chord candidates
without hand-rolling theory rules.

Use the Web MIDI API for USB MIDI controller input. Access must be requested via
`navigator.requestMIDIAccess()` in browsers that support it, and the app must
show an unsupported state where Web MIDI is unavailable. The implementation may
use `webmidi` as a small wrapper around the native API to simplify note-on and
note-off listeners, device enumeration, and connection events.

Use Tone.js `15.1.22` for optional in-browser sound. Tone.js wraps Web Audio
with musical abstractions, and browsers require audio startup from a user
gesture. Sound therefore starts only after the user turns on the sound control.

## User Experience

The first screen is the working practice surface, not a landing page.

The top area contains a compact app title, MIDI connection status, and a sound
toggle. The central area contains the chord readout. The lower area contains a
responsive piano keyboard. A narrow lower or side strip contains recent detected
chords.

The chord readout prioritizes the most useful learning information:

1. Detected chord name, or `No chord` when fewer than three useful pitch classes
   are active.
2. Pressed note names with octaves, such as `C4 E4 G4`.
3. Pitch classes, such as `C E G`, when helpful for chord detection.

The piano keyboard should support at least two octaves in the first version,
with a straightforward path to expand the range later. Middle C should be
visible by default.

## Input Model

The app keeps a single active-note state derived from all input sources.

- Pointer input adds a note on press and removes it on release or pointer
  cancel.
- Touch input follows the same path as pointer input.
- MIDI note-on with velocity greater than zero adds a note.
- MIDI note-off, or note-on with velocity zero, removes a note.
- Repeated note-on messages for an already active MIDI note update source data
  without duplicating the note.

Each active note records:

- MIDI note number.
- Note name with octave.
- Pitch class.
- Source: `pointer` or `midi`.
- Velocity when available.
- Started-at timestamp.

Chord detection operates on pitch classes, while display preserves octaves.

## MIDI States

The MIDI panel must make the current state visible in text:

- Unsupported: Web MIDI is not available in the current browser.
- Permission needed: the user has not granted MIDI access yet.
- Connected: at least one MIDI input is available and listeners are active.
- Disconnected: MIDI access exists but there are no input devices.
- Error: permission or runtime access failed.

The app should recommend Chrome, Edge, Opera, or Firefox when Web MIDI is
unsupported. It should avoid promising Safari support.

## Audio Behavior

Sound is off by default. When the user turns it on, the app starts Tone.js from
that user gesture and creates a simple polyphonic synth.

When sound is enabled:

- Note-on events trigger attack for that note.
- Note-off events trigger release for that note.
- Pointer and MIDI inputs both produce sound.
- Turning sound off releases all currently sounding notes.

When sound is disabled, the app remains fully useful as a visual MIDI and chord
learning tool.

## Chord and Progression Behavior

The current chord is recalculated whenever the active note set changes.

Use `tonal` chord detection and select the first candidate as the display name
for v1. If multiple candidates are returned, show the primary candidate and keep
the rest available in state for later UI expansion.

The progression trail records a chord when the detected chord changes from the
previous non-empty chord. It should keep a bounded recent list, such as the last
eight chord names, to avoid noisy growth.

## Visual Design

Use the Stitch design direction:

- Calm practice-workspace feel, not a marketing page.
- Off-white background, charcoal text, white piano keys, graphite black keys,
  teal active-note highlights, amber chord emphasis, muted red for errors.
- Tight, readable UI with 6-8px radii for panels and buttons.
- Immediate key press feedback with subtle brightness or scale changes.
- No decorative hero, nested cards, or purely ornamental gradients.

The piano keyboard must have stable dimensions so key labels, hover states, and
pressed states do not shift layout.

## Accessibility

- Piano keys are buttons with labels such as `C4` and `C#4`.
- Pressed state is exposed with `aria-pressed`.
- MIDI status and errors are text-visible, not color-only.
- The sound toggle clearly indicates whether sound is on or off.
- All controls are reachable by keyboard.
- Color contrast remains strong for active keys and status indicators.

## Testing Strategy

Unit-test the music-domain helpers:

- MIDI number to note-name conversion.
- Active note set updates for note-on and note-off events.
- Chord detection from active notes.
- Progression trail update behavior.

Component-test the main UI states:

- Empty state shows no active chord.
- Pointer pressing a piano key highlights it and updates the readout.
- MIDI unsupported state renders a clear message when Web MIDI is unavailable.
- Sound toggle can be enabled without starting audio until a user action path.

Manual verification should include:

- Start the Vite dev server.
- Open the app in a Web MIDI-capable browser.
- Press on-screen keys and verify highlighting, chord name, notes, and optional
  sound.
- Connect a USB MIDI controller and verify note-on and note-off reflection.

## Open Implementation Notes

The app can start with no routing. Keep the source split into small units:

- MIDI integration hook or service.
- Audio hook or service.
- Music theory helpers.
- Piano keyboard component.
- Chord readout component.
- Progression trail component.
- App shell.

This keeps Web MIDI, Web Audio, and UI concerns testable independently.
