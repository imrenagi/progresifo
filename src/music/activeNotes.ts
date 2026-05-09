import { midiToNoteName, noteNameToPitchClass } from "./notes";
import type { ActiveNote, ActiveNoteSource } from "./types";

type AddActiveNoteInput = {
  midi: number;
  source: ActiveNoteSource;
  velocity?: number;
  startedAt: number;
};

function activeNoteId(midi: number, source: ActiveNoteSource): string {
  return `${source}:${midi}`;
}

export function addActiveNote(
  activeNotes: ActiveNote[],
  input: AddActiveNoteInput,
): ActiveNote[] {
  const name = midiToNoteName(input.midi);
  const nextNote: ActiveNote = {
    id: activeNoteId(input.midi, input.source),
    midi: input.midi,
    name,
    pitchClass: noteNameToPitchClass(name),
    source: input.source,
    velocity: input.velocity,
    startedAt: input.startedAt,
  };

  const withoutExisting = activeNotes.filter((note) => note.id !== nextNote.id);
  return [...withoutExisting, nextNote].sort((a, b) => a.midi - b.midi);
}

export function removeActiveNote(
  activeNotes: ActiveNote[],
  midi: number,
  source: ActiveNoteSource,
): ActiveNote[] {
  const id = activeNoteId(midi, source);
  return activeNotes.filter((note) => note.id !== id);
}

export function removeAllNotesForSource(
  activeNotes: ActiveNote[],
  source: ActiveNoteSource,
): ActiveNote[] {
  return activeNotes.filter((note) => note.source !== source);
}

export function getUniqueMidiNumbers(activeNotes: ActiveNote[]): number[] {
  return Array.from(new Set(activeNotes.map((note) => note.midi))).sort(
    (a, b) => a - b,
  );
}

export function getDisplayNotes(activeNotes: ActiveNote[]): string[] {
  const byMidi = new Map<number, string>();

  activeNotes.forEach((note) => {
    byMidi.set(note.midi, note.name);
  });

  return Array.from(byMidi.entries())
    .sort(([a], [b]) => a - b)
    .map(([, name]) => name);
}
