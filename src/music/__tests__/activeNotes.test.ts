import { describe, expect, it } from "vitest";
import {
  addActiveNote,
  getDisplayNotes,
  getUniqueMidiNumbers,
  removeAllNotesForSource,
  removeActiveNote,
} from "../activeNotes";
import type { ActiveNote } from "../types";

describe("activeNotes", () => {
  it("adds and removes source-aware notes", () => {
    const pointer = addActiveNote([], {
      midi: 60,
      source: "pointer",
      startedAt: 10,
    });
    const bothSources = addActiveNote(pointer, {
      midi: 60,
      source: "midi",
      velocity: 96,
      startedAt: 11,
    });

    expect(bothSources).toHaveLength(2);
    expect(removeActiveNote(bothSources, 60, "pointer")).toHaveLength(1);
    expect(removeActiveNote(bothSources, 60, "midi")).toHaveLength(1);
  });

  it("updates repeated notes from the same source instead of duplicating", () => {
    const first = addActiveNote([], {
      midi: 64,
      source: "midi",
      velocity: 80,
      startedAt: 20,
    });
    const second = addActiveNote(first, {
      midi: 64,
      source: "midi",
      velocity: 100,
      startedAt: 25,
    });

    expect(second).toHaveLength(1);
    expect(second[0]).toMatchObject({ velocity: 100, startedAt: 25 });
  });

  it("deduplicates MIDI numbers and display names", () => {
    const active = [
      ...addActiveNote([], { midi: 60, source: "pointer", startedAt: 1 }),
      ...addActiveNote([], { midi: 60, source: "midi", startedAt: 2 }),
      ...addActiveNote([], { midi: 64, source: "midi", startedAt: 3 }),
    ];

    expect(getUniqueMidiNumbers(active)).toEqual([60, 64]);
    expect(getDisplayNotes(active)).toEqual(["C4", "E4"]);
  });

  it("removes all notes for a source", () => {
    const active = [60, 64, 67].reduce<ActiveNote[]>(
      (notes, midi, index) =>
        addActiveNote(
          addActiveNote(notes, {
            midi,
            source: "pointer",
            startedAt: index,
          }),
          {
            midi,
            source: "midi",
            startedAt: index + 10,
          },
        ),
      [],
    );

    const withoutMidi = removeAllNotesForSource(active, "midi");
    const withoutPointer = removeAllNotesForSource(active, "pointer");

    expect(withoutMidi).toHaveLength(3);
    expect(withoutMidi.every((note) => note.source === "pointer")).toBe(true);
    expect(withoutPointer).toHaveLength(3);
    expect(withoutPointer.every((note) => note.source === "midi")).toBe(true);
  });
});
