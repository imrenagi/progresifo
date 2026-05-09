import { describe, expect, it } from "vitest";
import { parseMidiMessage } from "../parseMidiMessage";

describe("parseMidiMessage", () => {
  it("parses note-on messages with velocity", () => {
    expect(parseMidiMessage([0x90, 60, 100])).toEqual({
      type: "note-on",
      note: 60,
      velocity: 100,
    });
  });

  it("parses note-on messages with velocity 0 as note-off", () => {
    expect(parseMidiMessage([0x90, 60, 0])).toEqual({
      type: "note-off",
      note: 60,
    });
  });

  it("parses note-off messages", () => {
    expect(parseMidiMessage([0x80, 60, 64])).toEqual({
      type: "note-off",
      note: 60,
    });
  });

  it("ignores non-note messages", () => {
    expect(parseMidiMessage([0xb0, 64, 127])).toEqual({ type: "ignored" });
  });
});
