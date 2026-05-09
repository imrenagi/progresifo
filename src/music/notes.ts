import { Note } from "tonal";
import type { PianoKey, PianoRange } from "./types";

export const FULL_PIANO_RANGE: PianoRange = { start: 21, end: 108 };
export const MOBILE_PIANO_RANGE: PianoRange = { start: 48, end: 71 };

const BLACK_KEY_PITCH_CLASSES = new Set(["C#", "D#", "F#", "G#", "A#"]);

export function midiToNoteName(midi: number): string {
  const noteName = Note.fromMidiSharps(midi);

  if (!noteName) {
    throw new Error(`Unable to convert MIDI note ${midi} to a note name.`);
  }

  return noteName;
}

export function noteNameToPitchClass(noteName: string): string {
  const pitchClass = Note.get(noteName).pc;

  if (!pitchClass) {
    throw new Error(`Unable to read pitch class from note ${noteName}.`);
  }

  return pitchClass;
}

export function isBlackKey(noteName: string): boolean {
  return BLACK_KEY_PITCH_CLASSES.has(noteNameToPitchClass(noteName));
}

export function buildPianoKeys(range: PianoRange): PianoKey[] {
  return Array.from({ length: range.end - range.start + 1 }, (_, index) => {
    const midi = range.start + index;
    const name = midiToNoteName(midi);

    return {
      midi,
      name,
      pitchClass: noteNameToPitchClass(name),
      isBlack: isBlackKey(name),
    };
  });
}
