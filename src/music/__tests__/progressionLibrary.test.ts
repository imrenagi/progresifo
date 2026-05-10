import { describe, expect, it } from "vitest";
import {
  doesProgressionStepMatchPitchClasses,
  getFirstProgressionId,
  getResolvedProgression,
  getResolvedProgressions,
  validateCuratedProgressions,
} from "../progressionLibrary";

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
});
