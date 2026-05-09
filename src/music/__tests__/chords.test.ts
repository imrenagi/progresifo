import { describe, expect, it } from "vitest";
import { addActiveNote } from "../activeNotes";
import { detectChord } from "../chords";
import type { ActiveNote } from "../types";

describe("chords", () => {
  it("returns no chord for fewer than three pitch classes", () => {
    const active = [
      ...addActiveNote([], { midi: 60, source: "pointer", startedAt: 1 }),
      ...addActiveNote([], { midi: 64, source: "pointer", startedAt: 2 }),
    ];

    expect(detectChord(active)).toMatchObject({
      primary: null,
      alternatives: [],
      candidates: [],
      pitchClasses: ["C", "E"],
    });
  });

  it("detects a major triad", () => {
    const active = [60, 64, 67].reduce<ActiveNote[]>(
      (notes, midi, index) =>
        addActiveNote(notes, { midi, source: "pointer", startedAt: index }),
      [],
    );

    expect(detectChord(active).primary).toBe("CM");
  });

  it("keeps alternate chord names visible", () => {
    const active = [64, 68, 71, 73].reduce<ActiveNote[]>(
      (notes, midi, index) =>
        addActiveNote(notes, { midi, source: "midi", startedAt: index }),
      [],
    );

    const detection = detectChord(active);

    expect(detection.primary).toBeTruthy();
    expect(detection.candidates.length).toBeGreaterThanOrEqual(1);
    expect(detection.alternatives).toEqual(detection.candidates.slice(1));
  });

  it("preserves played pitch order when detecting sixth chords", () => {
    const active = [64, 68, 71, 73].reduce<ActiveNote[]>(
      (notes, midi, index) =>
        addActiveNote(notes, { midi, source: "midi", startedAt: index }),
      [],
    );

    const detection = detectChord(active);

    expect(detection.pitchClasses).toEqual(["E", "G#", "B", "C#"]);
    expect(detection.primary).toBe("E6");
    expect(detection.alternatives).toContain("C#m7/E");
  });

  it("keeps inversion pitch order for slash-context candidates", () => {
    const active = [64, 67, 72].reduce<ActiveNote[]>(
      (notes, midi, index) =>
        addActiveNote(notes, { midi, source: "pointer", startedAt: index }),
      [],
    );

    const detection = detectChord(active);

    expect(detection.pitchClasses).toEqual(["E", "G", "C"]);
    expect(detection.primary).toBe("Em#5");
    expect(detection.alternatives).toContain("CM/E");
  });
});
