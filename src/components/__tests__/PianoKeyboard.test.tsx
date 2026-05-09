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

  it("shows only middle C as a visible key reference", () => {
    render(
      <PianoKeyboard
        activeMidiNumbers={[]}
        onNoteDown={vi.fn()}
        onNoteUp={vi.fn()}
        range={MOBILE_PIANO_RANGE}
      />,
    );

    expect(screen.getByRole("button", { name: "C4" })).toHaveTextContent(
      "C4",
    );
    expect(screen.getByRole("button", { name: "C#4" })).toHaveTextContent("");
    expect(screen.getByRole("button", { name: "D4" })).toHaveTextContent("");
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

  it("toggles pointer notes in latch interaction mode", () => {
    const onNoteDown = vi.fn();
    const onNoteUp = vi.fn();
    const { rerender } = render(
      <PianoKeyboard
        activeMidiNumbers={[]}
        interactionMode="latch"
        onNoteDown={onNoteDown}
        onNoteUp={onNoteUp}
        range={MOBILE_PIANO_RANGE}
      />,
    );

    const c4 = screen.getByRole("button", { name: "C4" });
    fireEvent.pointerDown(c4, { pointerId: 1 });
    fireEvent.pointerUp(c4, { pointerId: 1 });

    expect(onNoteDown).toHaveBeenCalledWith(60);
    expect(onNoteUp).not.toHaveBeenCalled();

    rerender(
      <PianoKeyboard
        activeMidiNumbers={[60]}
        interactionMode="latch"
        onNoteDown={onNoteDown}
        onNoteUp={onNoteUp}
        range={MOBILE_PIANO_RANGE}
      />,
    );

    fireEvent.pointerDown(c4, { pointerId: 2 });
    fireEvent.pointerUp(c4, { pointerId: 2 });

    expect(onNoteDown).toHaveBeenCalledTimes(1);
    expect(onNoteUp).toHaveBeenCalledWith(60);
  });

  it("does not release a pointer-held note on blur", () => {
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
    fireEvent.blur(c4);

    expect(onNoteUp).not.toHaveBeenCalled();

    fireEvent.pointerUp(c4);

    expect(onNoteUp).toHaveBeenCalledTimes(1);
    expect(onNoteUp).toHaveBeenCalledWith(60);
  });

  it("fires keyboard note events for middle C", () => {
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
    fireEvent.keyDown(c4, { key: " " });
    fireEvent.keyUp(c4, { key: " " });

    expect(onNoteDown).toHaveBeenCalledWith(60);
    expect(onNoteUp).toHaveBeenCalledWith(60);
  });

  it("does not duplicate note down while a keyboard key repeats", () => {
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
    fireEvent.keyDown(c4, { key: "Enter" });
    fireEvent.keyDown(c4, { key: "Enter", repeat: true });
    fireEvent.keyUp(c4, { key: "Enter" });

    expect(onNoteDown).toHaveBeenCalledTimes(1);
    expect(onNoteUp).toHaveBeenCalledTimes(1);
  });
});
