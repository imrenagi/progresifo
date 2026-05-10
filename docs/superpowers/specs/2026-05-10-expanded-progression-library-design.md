# Expanded Progression Library Design

## Status

Approved for specification on 2026-05-10.

## Context

The Full Progressions mode currently exposes a small curated set of complete
progressions for each genre and major/minor mode. The user wants many more
progressions per genre, informed by common genre practice, while keeping the
feature curated and playable.

Literal "all possible progressions" is not finite because progression length,
substitutions, turnarounds, modal interchange, and reharmonization can vary
without bound. The implementation should instead add the largest useful set of
representative progressions supported by the current progression graph.

## Goals

- Expand curated full progressions for every existing genre and key mode.
- Favor well-known genre patterns: pop axis rotations, jazz ii-V-I and
  turnarounds, blues dominant forms, classical cadences and circle motion,
  gospel suspended/secondary-dominant motion, and neo-soul extended-color loops.
- Use only node IDs already present in `src/music/progressionGraph.ts`.
- Keep all new entries valid through `validateCuratedProgressions()`.
- Keep progression names short and descriptive.
- Preserve existing first progression IDs so current tests and default UX remain
  stable.

## Non-Goals

- Do not generate arbitrary graph paths.
- Do not add UI filtering or categories in this change.
- Do not add new graph nodes unless a later feature explicitly calls for it.
- Do not claim the library is exhaustive.

## Design

Expand `src/music/progressionLibrary.ts` by adding additional
`CuratedProgression` entries under each existing `genre + mode` bucket. Target
six or more progressions per bucket where the current graph has enough distinct
nodes to support useful variation. Smaller graphs may repeat useful rotations
or cadence variants, but should avoid duplicate `nodeIds` sequences within the
same bucket.

The expansion should include tests that enforce:

- every supported genre/mode has a richer minimum progression count;
- all progression IDs are unique within a genre/mode bucket;
- all progression sequences are unique within a genre/mode bucket;
- `validateCuratedProgressions()` still returns no errors.

## Verification

Run `make verify`. Manually spot-check Full Progressions mode in the browser for
at least two genres to confirm the larger lists render and remain selectable.
