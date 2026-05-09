import { describe, expect, it } from "vitest";
import { addChordToProgression } from "../progression";
import type { ProgressionEntry } from "../progression";

describe("progression", () => {
  it("records non-empty chord changes", () => {
    const first = addChordToProgression([], "C", 100);
    const repeated = addChordToProgression(first, "C", 110);
    const next = addChordToProgression(repeated, "G", 120);

    expect(repeated).toHaveLength(1);
    expect(next.map((entry) => entry.name)).toEqual(["C", "G"]);
  });

  it("ignores empty chord names", () => {
    expect(addChordToProgression([], null, 100)).toEqual([]);
  });

  it("keeps the latest eight chords", () => {
    const names = ["C", "Dm", "Em", "F", "G", "Am", "Bdim", "Cmaj7", "G7"];
    const trail = names.reduce<ProgressionEntry[]>(
      (entries, name, index) => addChordToProgression(entries, name, index),
      [],
    );

    expect(trail).toHaveLength(8);
    expect(trail[0].name).toBe("Dm");
    expect(trail.at(-1)?.name).toBe("G7");
  });
});
