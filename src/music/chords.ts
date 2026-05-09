import { Chord } from "tonal";
import type { ActiveNote, ChordDetection } from "./types";

function getPitchClasses(activeNotes: ActiveNote[]): string[] {
  return Array.from(new Set(activeNotes.map((note) => note.pitchClass))).sort();
}

export function detectChord(activeNotes: ActiveNote[]): ChordDetection {
  const pitchClasses = getPitchClasses(activeNotes);

  if (pitchClasses.length < 3) {
    return {
      primary: null,
      alternatives: [],
      candidates: [],
      pitchClasses,
    };
  }

  const candidates = Chord.detect(pitchClasses);

  return {
    primary: candidates[0] ?? null,
    alternatives: candidates.slice(1),
    candidates,
    pitchClasses,
  };
}
