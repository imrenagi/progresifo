import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildChordConstructionExamples,
  buildChordTarget,
  buildScalePitchClasses,
  CHORD_FAMILY_ORDER,
  CHORD_TYPES,
  doesPitchClassSetMatchChordTarget,
  getChordTypeById,
  getChordTypesByFamily,
} from "../chordConstruction";
import { MOBILE_PIANO_RANGE } from "../notes";
import type { ChordType } from "../types";

describe("chordConstruction", () => {
  afterEach(() => {
    vi.doUnmock("../notes");
  });

  it("keeps the chord catalog IDs unique and in learning order", () => {
    const ids = CHORD_TYPES.map((type) => type.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "major",
      "minor",
      "diminished",
      "augmented",
      "sus-2",
      "sus-4",
      "add-9",
      "six",
      "minor-six",
      "dominant-7",
      "major-7",
      "minor-7",
      "minor-7-flat-5",
      "diminished-7",
      "dominant-9",
      "major-9",
      "minor-9",
      "dominant-11",
      "dominant-13",
      "dominant-7-flat-9",
      "dominant-7-sharp-9",
      "dominant-7-flat-5",
      "dominant-7-sharp-5",
    ]);
  });

  it("has beginner-facing metadata for every catalog entry", () => {
    CHORD_TYPES.forEach((type) => {
      expect(type.name).not.toBe("");
      expect(type.formula).not.toBe("");
      expect(type.description.length).toBeGreaterThan(24);
      expect(type.usage.length).toBeGreaterThan(24);
      expect(type.feeling.length).toBeGreaterThan(12);
      expect(type.examples.length).toBeGreaterThanOrEqual(1);
    });
  });

  it("groups chord families in the expected order", () => {
    expect(CHORD_FAMILY_ORDER).toEqual([
      "triads",
      "suspended-add",
      "sixths",
      "sevenths",
      "extended",
      "altered",
    ]);
  });

  it("returns the triad group in catalog order", () => {
    expect(getChordTypesByFamily("triads").map((type) => type.id)).toEqual([
      "major",
      "minor",
      "diminished",
      "augmented",
    ]);
  });

  it("builds an ascending C dominant seventh target from middle C", () => {
    const target = buildChordTarget("C", getChordTypeById("dominant-7"));

    expect(target.pitchClasses).toEqual(["C", "E", "G", "A#"]);
    expect(target.noteNames).toEqual(["C4", "E4", "G4", "A#4"]);
    expect(target.midiNumbers).toEqual([60, 64, 67, 70]);
  });

  it("builds an ascending G dominant seventh target from G4 without a range", () => {
    const target = buildChordTarget("G", getChordTypeById("dominant-7"));

    expect(target.pitchClasses).toEqual(["G", "B", "D", "F"]);
    expect(target.noteNames).toEqual(["G4", "B4", "D5", "F5"]);
    expect(target.midiNumbers).toEqual([67, 71, 74, 77]);
  });

  it("builds a compact in-range dominant seventh target when a piano range is supplied", () => {
    const target = buildChordTarget(
      "G",
      getChordTypeById("dominant-7"),
      MOBILE_PIANO_RANGE,
    );

    expect(target.noteNames).toEqual(["D3", "F3", "G3", "B3"]);
    expect(target.midiNumbers).toEqual([50, 53, 55, 59]);
    expect(
      target.midiNumbers.every(
        (midi) => midi >= MOBILE_PIANO_RANGE.start && midi <= MOBILE_PIANO_RANGE.end,
      ),
    ).toBe(true);
  });

  it("throws a clear error when a chord target cannot fit the supplied range", () => {
    expect(() =>
      buildChordTarget("G", getChordTypeById("dominant-13"), {
        start: MOBILE_PIANO_RANGE.start,
        end: 52,
      }),
    ).toThrow(/Unable to voice G13 within MIDI range 48-52/);
  });

  it("normalizes flat roots to sharp computational pitch classes", () => {
    const target = buildChordTarget("Bb", getChordTypeById("major"));

    expect(target.pitchClasses).toEqual(["A#", "D", "F"]);
  });

  it("builds major and minor scale pitch classes with sharp spelling", () => {
    expect(buildScalePitchClasses("C", "major")).toEqual([
      "C",
      "D",
      "E",
      "F",
      "G",
      "A",
      "B",
    ]);
    expect(buildScalePitchClasses("A", "minor")).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
      "G",
    ]);
  });

  it("builds in-scale and on-scale-root construction examples", () => {
    const examples = buildChordConstructionExamples(
      getChordTypeById("major-7"),
      "C",
      "major",
    );

    expect(examples.inScale.map((example) => example.chordName)).toEqual([
      "Cmaj7",
      "Fmaj7",
    ]);
    expect(examples.onScaleRoots).toHaveLength(7);
    expect(examples.onScaleRoots.map((example) => example.chordName)).toContain(
      "Dmaj7",
    );
  });

  it("builds mobile dominant thirteenth examples with every target MIDI in range", () => {
    const examples = buildChordConstructionExamples(
      getChordTypeById("dominant-13"),
      "C",
      "major",
      MOBILE_PIANO_RANGE,
    );
    const allExamples = [...examples.inScale, ...examples.onScaleRoots];

    expect(allExamples.length).toBeGreaterThan(0);
    expect(
      allExamples.every((example) =>
        example.target.midiNumbers.every(
          (midi) =>
            midi >= MOBILE_PIANO_RANGE.start && midi <= MOBILE_PIANO_RANGE.end,
        ),
      ),
    ).toBe(true);
  });

  it("builds a mobile G dominant thirteenth target with all expected pitch classes", () => {
    const target = buildChordTarget(
      "G",
      getChordTypeById("dominant-13"),
      MOBILE_PIANO_RANGE,
    );

    expect(target.midiNumbers.every((midi) => midi >= 48 && midi <= 71)).toBe(true);
    expect(new Set(target.pitchClasses)).toEqual(
      new Set(["G", "B", "D", "F", "A", "E"]),
    );
  });

  it("matches exact chord pitch-class sets independent of inversion", () => {
    const target = buildChordTarget("C", getChordTypeById("minor-7"));

    expect(target.pitchClasses).toEqual(["C", "D#", "G", "A#"]);
    expect(
      doesPitchClassSetMatchChordTarget(["A#", "G", "C", "D#"], target.pitchClasses),
    ).toBe(true);
    expect(
      doesPitchClassSetMatchChordTarget(
        ["A#", "G", "C", "D#", "F"],
        target.pitchClasses,
      ),
    ).toBe(false);
    expect(
      doesPitchClassSetMatchChordTarget(["A#", "G", "C"], target.pitchClasses),
    ).toBe(false);
    expect(
      doesPitchClassSetMatchChordTarget(["A#", "G", "C", "nope"], target.pitchClasses),
    ).toBe(false);
  });

  it("rejects non-finite chord intervals before MIDI target resolution", async () => {
    vi.resetModules();
    vi.doMock("../notes", () => ({
      midiToNoteName: (midi: number) => {
        if (midi > 72) {
          throw new Error("MIDI search exceeded one octave");
        }

        return `Mock${midi}`;
      },
      noteNameToPitchClass: () => "C",
    }));

    const { buildChordTarget: buildTargetWithMockedNotes } = await import(
      "../chordConstruction"
    );
    const invalidType: ChordType = {
      ...getChordTypeById("major"),
      id: "invalid-non-finite",
      intervals: [0, Number.NaN],
    };

    expect(() => buildTargetWithMockedNotes("C", invalidType)).toThrow(
      /finite interval/i,
    );
  });

  it("does not expose mutable catalog state to consumers", () => {
    const mutableCatalog = CHORD_TYPES as unknown as ChordType[];
    const mutableFamilyOrder = CHORD_FAMILY_ORDER as unknown as string[];
    const major = getChordTypeById("major") as unknown as {
      intervals: number[];
      commonFunctions: string[];
      examples: string[];
    };
    const triads = getChordTypesByFamily("triads");
    const mutableFirstTriad = triads[0] as unknown as { examples: string[] };

    expect(() => {
      mutableCatalog.push(getChordTypeById("minor"));
    }).toThrow(TypeError);
    expect(() => {
      mutableFamilyOrder.push("altered");
    }).toThrow(TypeError);
    expect(() => {
      major.intervals.push(99);
    }).toThrow(TypeError);
    expect(() => {
      major.commonFunctions.push("dominant");
    }).toThrow(TypeError);
    expect(() => {
      major.examples.push("C -> bogus");
    }).toThrow(TypeError);
    expect(() => {
      mutableFirstTriad.examples.push("C -> bogus");
    }).toThrow(TypeError);

    expect(CHORD_TYPES.map((type) => type.id)).toEqual([
      "major",
      "minor",
      "diminished",
      "augmented",
      "sus-2",
      "sus-4",
      "add-9",
      "six",
      "minor-six",
      "dominant-7",
      "major-7",
      "minor-7",
      "minor-7-flat-5",
      "diminished-7",
      "dominant-9",
      "major-9",
      "minor-9",
      "dominant-11",
      "dominant-13",
      "dominant-7-flat-9",
      "dominant-7-sharp-9",
      "dominant-7-flat-5",
      "dominant-7-sharp-5",
    ]);
    expect(getChordTypeById("major").intervals).toEqual([0, 4, 7]);
    expect(getChordTypeById("major").examples).toEqual([
      "C -> F -> G",
      "G -> C",
    ]);
  });
});
