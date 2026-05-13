import { describe, expect, it } from "vitest";
import {
  buildScaleStaffNotes,
  buildScaleTarget,
  doesPitchClassSetMatchScaleTarget,
  getScaleTypeById,
  getScaleTypesByFamily,
  SCALE_FAMILY_ORDER,
  SCALE_TYPES,
} from "../scales";
import { MOBILE_PIANO_RANGE } from "../notes";

describe("scales", () => {
  it("keeps the scale catalog IDs unique and in learning order", () => {
    const ids = SCALE_TYPES.map((type) => type.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual([
      "major",
      "natural-minor",
      "harmonic-minor",
      "melodic-minor",
      "major-pentatonic",
      "minor-pentatonic",
      "blues",
      "dorian",
      "phrygian",
      "lydian",
      "mixolydian",
      "locrian",
      "whole-tone",
      "diminished-whole-half",
      "diminished-half-whole",
    ]);
  });

  it("has learner-facing metadata for every catalog entry", () => {
    SCALE_TYPES.forEach((type) => {
      expect(type.name, type.id).not.toBe("");
      expect(type.formula, type.id).not.toBe("");
      expect(type.steps, type.id).not.toBe("");
      expect(type.description.length, type.id).toBeGreaterThan(24);
      expect(type.usage.length, type.id).toBeGreaterThan(24);
      expect(type.genres.length, type.id).toBeGreaterThan(0);
    });
  });

  it("groups scale families in the expected order", () => {
    expect(SCALE_FAMILY_ORDER).toEqual([
      "core",
      "pentatonic-blues",
      "modes",
      "symmetric",
    ]);
    expect(getScaleTypesByFamily("core").map((type) => type.id)).toEqual([
      "major",
      "natural-minor",
      "harmonic-minor",
      "melodic-minor",
    ]);
  });

  it("builds C major with display notes, pitch classes, and piano target", () => {
    const target = buildScaleTarget("C", getScaleTypeById("major"));

    expect(target.noteNames).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
    expect(target.pitchClasses).toEqual(["C", "D", "E", "F", "G", "A", "B"]);
    expect(target.midiNumbers).toEqual([60, 62, 64, 65, 67, 69, 71]);
  });

  it("uses conventional flat-root spelling for display", () => {
    const target = buildScaleTarget("Bb", getScaleTypeById("major"));

    expect(target.noteNames).toEqual(["Bb", "C", "D", "Eb", "F", "G", "A"]);
    expect(target.pitchClasses).toEqual(["A#", "C", "D", "D#", "F", "G", "A"]);
  });

  it("builds A minor pentatonic notes", () => {
    const target = buildScaleTarget("A", getScaleTypeById("minor-pentatonic"));

    expect(target.noteNames).toEqual(["A", "C", "D", "E", "G"]);
    expect(target.pitchClasses).toEqual(["A", "C", "D", "E", "G"]);
    expect(target.midiNumbers).toEqual([69, 72, 74, 76, 79]);
  });

  it("spells altered scale degrees from the formula instead of sharp-only pitch classes", () => {
    const target = buildScaleTarget("C", getScaleTypeById("minor-pentatonic"));

    expect(target.noteNames).toEqual(["C", "Eb", "F", "G", "Bb"]);
    expect(target.pitchClasses).toEqual(["C", "D#", "F", "G", "A#"]);
  });

  it("builds mobile-range MIDI targets without referencing hidden keys", () => {
    const target = buildScaleTarget(
      "C",
      getScaleTypeById("major"),
      MOBILE_PIANO_RANGE,
    );

    expect(target.midiNumbers).toEqual([48, 50, 52, 53, 55, 57, 59]);
    expect(
      target.midiNumbers.every(
        (midi) => midi >= MOBILE_PIANO_RANGE.start && midi <= MOBILE_PIANO_RANGE.end,
      ),
    ).toBe(true);
  });

  it("matches exact scale pitch-class sets independent of octave", () => {
    const target = buildScaleTarget("C", getScaleTypeById("major"));

    expect(
      doesPitchClassSetMatchScaleTarget(
        ["G", "E", "C", "B", "D", "F", "A"],
        target.pitchClasses,
      ),
    ).toBe(true);
    expect(
      doesPitchClassSetMatchScaleTarget(
        ["G", "E", "C", "B", "D", "F", "A", "A#"],
        target.pitchClasses,
      ),
    ).toBe(false);
    expect(
      doesPitchClassSetMatchScaleTarget(
        ["G", "E", "C", "B", "D", "F"],
        target.pitchClasses,
      ),
    ).toBe(false);
    expect(
      doesPitchClassSetMatchScaleTarget(
        ["G", "E", "C", "B", "D", "F", "nope"],
        target.pitchClasses,
      ),
    ).toBe(false);
  });

  it("generates staff note data in ascending scale order", () => {
    const target = buildScaleTarget("C", getScaleTypeById("major"));

    expect(buildScaleStaffNotes(target)).toEqual([
      { noteName: "C4", pitchClass: "C", octave: 4, staffStep: 0 },
      { noteName: "D4", pitchClass: "D", octave: 4, staffStep: 1 },
      { noteName: "E4", pitchClass: "E", octave: 4, staffStep: 2 },
      { noteName: "F4", pitchClass: "F", octave: 4, staffStep: 3 },
      { noteName: "G4", pitchClass: "G", octave: 4, staffStep: 4 },
      { noteName: "A4", pitchClass: "A", octave: 4, staffStep: 5 },
      { noteName: "B4", pitchClass: "B", octave: 4, staffStep: 6 },
    ]);
  });

  it("passes conventional scale spellings into staff notes", () => {
    const target = buildScaleTarget("C", getScaleTypeById("blues"));

    expect(buildScaleStaffNotes(target).map((note) => note.noteName)).toEqual([
      "C4",
      "Eb4",
      "F4",
      "Gb4",
      "G4",
      "Bb4",
    ]);
  });
});
