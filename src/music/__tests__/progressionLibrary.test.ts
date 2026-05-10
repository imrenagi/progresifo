import { describe, expect, it } from "vitest";
import {
  doesProgressionStepMatchPitchClasses,
  getCuratedProgressions,
  getFirstProgressionId,
  getResolvedProgression,
  getResolvedProgressions,
  validateProgressionLibrary,
  validateCuratedProgressions,
} from "../progressionLibrary";
import { PROGRESSION_GENRES } from "../progressionGraph";
import type { CuratedProgression, KeyMode } from "../types";

describe("progressionLibrary", () => {
  it("resolves curated progressions into transposed display sequences", () => {
    const progressions = getResolvedProgressions("pop", "major", "D");

    expect(progressions.length).toBeGreaterThanOrEqual(2);
    expect(progressions[0]).toMatchObject({
      id: "pop-axis",
      name: "Axis Progression",
      displaySequence: "I (D) - V7 (A7) - vi (Bm) - IV (G)",
    });
    expect(progressions[0].steps.map((step) => step.displayName)).toEqual([
      "I (D)",
      "V7 (A7)",
      "vi (Bm)",
      "IV (G)",
    ]);
  });

  it("returns the first progression id for a genre and mode", () => {
    expect(getFirstProgressionId("pop", "major")).toBe("pop-axis");
    expect(getFirstProgressionId("pop", "minor")).toBe("pop-minor-loop");
  });

  it("does not expose mutable curated progression storage", () => {
    const progressions = getCuratedProgressions("pop", "major");
    const mutableProgressions = progressions as CuratedProgression[];

    mutableProgressions.shift();
    (mutableProgressions[0].nodeIds as string[]).push("ii");

    expect(getFirstProgressionId("pop", "major")).toBe("pop-axis");
    expect(getCuratedProgressions("pop", "major")[0].nodeIds).toEqual([
      "I",
      "V7",
      "vi",
      "IV",
    ]);
  });

  it("resolves one selected progression with concrete target keys", () => {
    const progression = getResolvedProgression("pop", "major", "C", "pop-axis");

    expect(progression?.steps[0]).toMatchObject({
      nodeId: "I",
      displayName: "I (C)",
      target: {
        noteNames: ["C4", "E4", "G4"],
        midiNumbers: [60, 64, 67],
        pitchClasses: ["C", "E", "G"],
      },
    });
    expect(progression?.steps[1]).toMatchObject({
      nodeId: "V7",
      displayName: "V7 (G7)",
      target: {
        noteNames: ["G4", "B4", "D5", "F5"],
        midiNumbers: [67, 71, 74, 77],
        pitchClasses: ["G", "B", "D", "F"],
      },
    });
  });

  it("returns null for missing selected progression ids", () => {
    expect(getResolvedProgression("pop", "major", "C", null)).toBeNull();
    expect(getResolvedProgression("pop", "major", "C", undefined)).toBeNull();
    expect(
      getResolvedProgression("pop", "major", "C", "unknown-progression"),
    ).toBeNull();
  });

  it("matches a progression step across inversions and octaves", () => {
    const progression = getResolvedProgression("pop", "major", "C", "pop-axis");

    expect(progression).not.toBeNull();
    expect(
      doesProgressionStepMatchPitchClasses(progression!.steps[2], [
        "E",
        "A",
        "C",
      ]),
    ).toBe(true);
    expect(
      doesProgressionStepMatchPitchClasses(progression!.steps[2], ["A", "C"]),
    ).toBe(false);
  });

  it("includes curated progressions for every supported genre and mode", () => {
    expect(validateCuratedProgressions()).toEqual([]);
  });

  it("provides a larger curated library for every genre and mode", () => {
    const modes: KeyMode[] = ["major", "minor"];

    PROGRESSION_GENRES.forEach((genre) => {
      modes.forEach((mode) => {
        expect(
          getResolvedProgressions(genre, mode, "C"),
          `${genre} ${mode}`,
        ).toHaveLength(6);
      });
    });
  });

  it("keeps curated progression ids and sequences unique per genre and mode", () => {
    const modes: KeyMode[] = ["major", "minor"];

    PROGRESSION_GENRES.forEach((genre) => {
      modes.forEach((mode) => {
        const progressions = getResolvedProgressions(genre, mode, "C");
        const ids = progressions.map((progression) => progression.id);
        const sequences = progressions.map((progression) =>
          progression.steps.map((step) => step.nodeId).join(" "),
        );

        expect(new Set(ids).size, `${genre} ${mode} ids`).toBe(ids.length);
        expect(new Set(sequences).size, `${genre} ${mode} sequences`).toBe(
          sequences.length,
        );
      });
    });
  });

  it("reports validation errors for empty lists and unknown node references", () => {
    expect(
      validateProgressionLibrary({
        pop: {
          major: [
            {
              id: "invalid-pop",
              name: "Invalid Pop",
              nodeIds: ["I", "missing-node"],
            },
          ],
          minor: [],
        },
      }),
    ).toEqual(
      expect.arrayContaining([
        "Unknown node missing-node in progression invalid-pop for pop major.",
        "No curated progressions for pop minor.",
      ]),
    );
  });
});
