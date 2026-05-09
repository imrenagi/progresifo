import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MOBILE_PIANO_RANGE } from "../../music/notes";
import { PianoKeyboard } from "../PianoKeyboard";

describe("PianoKeyboard", () => {
  it("renders accessible piano keys with active pressed state", () => {
    render(
      <PianoKeyboard
        activeMidiNumbers={[60]}
        onNoteDown={vi.fn()}
        onNoteUp={vi.fn()}
        range={MOBILE_PIANO_RANGE}
      />,
    );

    expect(screen.getByRole("button", { name: "C4" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "C#4" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("fires pointer note events for middle C", () => {
    const onNoteDown = vi.fn();
    const onNoteUp = vi.fn();

    render(
      <PianoKeyboard
        activeMidiNumbers={[]}
        onNoteDown={onNoteDown}
        onNoteUp={onNoteUp}
        range={MOBILE_PIANO_RANGE}
      />,
    );

    const c4 = screen.getByRole("button", { name: "C4" });
    fireEvent.pointerDown(c4, { pointerId: 1 });
    fireEvent.pointerUp(c4);

    expect(onNoteDown).toHaveBeenCalledWith(60);
    expect(onNoteUp).toHaveBeenCalledWith(60);
  });
});
