# AGENTS.md

## Project Overview

Progresifo is a React, Vite, TypeScript, and Tailwind CSS v4 web app for
learning piano chords and chord progressions. It supports pointer input,
optional Tone.js playback, and native Web MIDI input.

## Development Commands

- `make install` installs dependencies.
- `make dev` starts the Vite development server.
- `make test` runs the Vitest suite once.
- `make lint` runs TypeScript typechecking.
- `make build` runs typechecking and production build.
- `make verify` runs tests, lint, and build.

Use the underlying `npm` scripts directly when a narrower command is useful.

## Coding Guidelines

- Prefer existing React component and hook patterns before introducing new
  abstractions.
- Keep MIDI, audio, and music-theory logic owner-aware. A pointer action should
  not clear MIDI-owned notes unless the behavior explicitly requires it.
- Add or update tests for behavior changes. For interaction changes, prefer
  Testing Library tests that exercise the user-visible workflow.
- Keep generated artifacts such as `node_modules/` and `dist/` out of commits.

## Verification

Before reporting implementation work as complete, run:

```sh
make verify
```
