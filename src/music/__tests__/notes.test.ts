import { describe, expect, it } from "vitest";
import {
  FULL_PIANO_RANGE,
  MOBILE_PIANO_RANGE,
  buildPianoKeys,
  isBlackKey,
  midiToNoteName,
  noteNameToPitchClass,
} from "../notes";

describe("notes", () => {
  it("converts MIDI numbers to sharp note names", () => {
    expect(midiToNoteName(60)).toBe("C4");
    expect(midiToNoteName(61)).toBe("C#4");
    expect(midiToNoteName(108)).toBe("C8");
  });

  it("extracts pitch classes", () => {
    expect(noteNameToPitchClass("C#4")).toBe("C#");
    expect(noteNameToPitchClass("Bb3")).toBe("Bb");
  });

  it("builds the full 88-key piano range", () => {
    const keys = buildPianoKeys(FULL_PIANO_RANGE);
    expect(keys).toHaveLength(88);
    expect(keys[0]).toMatchObject({ midi: 21, name: "A0" });
    expect(keys.at(-1)).toMatchObject({ midi: 108, name: "C8" });
  });

  it("builds a playable two-octave mobile range with middle C", () => {
    const keys = buildPianoKeys(MOBILE_PIANO_RANGE);
    expect(keys).toHaveLength(24);
    expect(keys.some((key) => key.name === "C4")).toBe(true);
  });

  it("identifies black keys", () => {
    expect(isBlackKey("C#4")).toBe(true);
    expect(isBlackKey("C4")).toBe(false);
  });
});
