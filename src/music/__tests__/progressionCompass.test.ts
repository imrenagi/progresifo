import { describe, expect, it } from "vitest";
import {
  buildCompassNodeView,
  buildProgressionSuggestions,
  buildTargetVoicingForNode,
  doesPitchClassSetMatchTarget,
  findMatchingSuggestion,
  getStarterSuggestions,
} from "../progressionCompass";
import type { ProgressionSuggestion } from "../types";

describe("progressionCompass", () => {
  it("transposes starter suggestions into concrete chord names", () => {
    const starters = getStarterSuggestions("pop", "major", "D");

    expect(starters.map((suggestion) => suggestion.displayName)).toEqual([
      "I (D)",
      "vi (Bm)",
      "IV (G)",
    ]);
    expect(starters[0].target.noteNames).toEqual(["D4", "F#4", "A4"]);
  });

  it("builds next suggestions with labels, reasons, and target voicings", () => {
    const current = buildCompassNodeView("neo-soul", "major", "C", "Imaj7");
    const suggestions = buildProgressionSuggestions(
      "neo-soul",
      "major",
      "C",
      current.nodeId,
    );

    expect(current.displayName).toBe("Imaj7 (Cmaj7)");
    expect(suggestions.map((suggestion) => suggestion.displayName)).toContain(
      "IVmaj7 (Fmaj7)",
    );
    expect(suggestions[0]).toMatchObject({
      difficulty: "colorful",
      functionLabel: "smooth",
    });
    expect(suggestions[0].target.midiNumbers.length).toBeGreaterThanOrEqual(4);
  });

  it("builds target pitch classes for graph nodes", () => {
    const target = buildTargetVoicingForNode("pop", "major", "C", "I");

    expect(target.pitchClasses).toEqual(["C", "E", "G"]);
    expect(
      doesPitchClassSetMatchTarget(["E", "G", "C"], target.pitchClasses),
    ).toBe(true);
  });

  it("matches a selected target across inversions and octaves", () => {
    const [target] = buildProgressionSuggestions("pop", "major", "C", "I");
    const matched = findMatchingSuggestion([target], ["A", "C", "E"]);

    expect(target.displayName).toBe("vi (Am)");
    expect(matched?.id).toBe(target.id);
  });

  it("does not match incomplete pitch-class sets", () => {
    const [target] = buildProgressionSuggestions("pop", "major", "C", "I");

    expect(findMatchingSuggestion([target], ["A", "C"])).toBeNull();
  });

  it("supports richer qualities in generated labels", () => {
    const suggestions = buildProgressionSuggestions(
      "jazz",
      "minor",
      "A",
      "iim7b5",
    );
    const altered = suggestions.find(
      (suggestion: ProgressionSuggestion) => suggestion.nodeId === "V7alt",
    );

    expect(altered?.displayName).toBe("V7alt (E7alt)");
    expect(altered?.difficulty).toBe("advanced");
  });

  it("raises minor leading-tone diminished roots", () => {
    const leadingTone = buildCompassNodeView(
      "classical",
      "minor",
      "C",
      "viio7",
    );

    expect(leadingTone.displayName).toBe("viio7 (Bdim7)");
  });

  it("uses display quality for labels while keeping computational target intervals", () => {
    const suggestions = buildProgressionSuggestions(
      "neo-soul",
      "major",
      "C",
      "Imaj7",
    );
    const borrowedDominant = suggestions.find(
      (suggestion: ProgressionSuggestion) =>
        suggestion.nodeId === "bVII13sus",
    );

    expect(borrowedDominant?.displayName).toBe("bVII13sus (Bb13sus)");
    expect(borrowedDominant?.target.pitchClasses).toEqual([
      "A#",
      "D#",
      "F",
      "G#",
      "G",
    ]);
  });

  it("uses flat spelling for flat-key tonic labels", () => {
    expect(buildCompassNodeView("pop", "major", "Bb", "I").displayName).toBe(
      "I (Bb)",
    );
  });

  it("uses flat spelling for common flat-key starter suggestions", () => {
    expect(
      getStarterSuggestions("pop", "major", "F").map(
        (suggestion) => suggestion.displayName,
      ),
    ).toContain("IV (Bb)");
  });

  it("uses diatonic spelling for flat-key starter suggestions", () => {
    expect(
      getStarterSuggestions("pop", "major", "Gb").map(
        (suggestion) => suggestion.displayName,
      ),
    ).toContain("IV (Cb)");
  });

  it("uses diatonic spelling for flat-key tonic labels", () => {
    expect(buildCompassNodeView("pop", "major", "Cb", "I").displayName).toBe(
      "I (Cb)",
    );
  });

  it("does not match invalid played pitch-class input", () => {
    const target = buildTargetVoicingForNode("pop", "major", "C", "I");

    expect(
      doesPitchClassSetMatchTarget(
        ["C", "E", "G", "definitely-not-a-note"],
        target.pitchClasses,
      ),
    ).toBe(false);
  });
});
