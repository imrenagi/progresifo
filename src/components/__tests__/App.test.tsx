import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { StrictMode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";

const mocks = vi.hoisted(() => ({
  connectMidi: vi.fn(),
  disableAudio: vi.fn(),
  enableAudio: vi.fn(),
  triggerAttack: vi.fn(),
  triggerRelease: vi.fn(),
  midiStatus: "connected",
  midiInputs: [{ id: "test-input", name: "Test MIDI", manufacturer: "Test" }],
  midiCallbacks: {} as {
    onNoteOn?: (event: {
      note: number;
      velocity?: number;
      input: { id: string; name: string; manufacturer: string };
    }) => void;
    onNoteOff?: (event: {
      note: number;
      input: { id: string; name: string; manufacturer: string };
    }) => void;
  },
}));

vi.mock("../../audio/useToneSynth", () => ({
  useToneSynth: () => ({
    status: "on",
    enable: mocks.enableAudio,
    disable: mocks.disableAudio,
    triggerAttack: mocks.triggerAttack,
    triggerRelease: mocks.triggerRelease,
  }),
}));

vi.mock("../../midi/useMidiInput", () => ({
  useMidiInput: (options: typeof mocks.midiCallbacks) => {
    mocks.midiCallbacks.onNoteOn = options.onNoteOn;
    mocks.midiCallbacks.onNoteOff = options.onNoteOff;

    return {
      status: mocks.midiStatus,
      inputs: mocks.midiInputs,
      error: null,
      connect: mocks.connectMidi,
    };
  },
}));

function currentChordReadout() {
  return within(screen.getByRole("region", { name: "Current chord" }));
}

describe("App", () => {
  beforeEach(() => {
    mocks.connectMidi.mockClear();
    mocks.disableAudio.mockClear();
    mocks.enableAudio.mockClear();
    mocks.triggerAttack.mockClear();
    mocks.triggerRelease.mockClear();
    mocks.midiStatus = "connected";
    mocks.midiInputs = [
      { id: "test-input", name: "Test MIDI", manufacturer: "Test" },
    ];
    mocks.midiCallbacks.onNoteOn = undefined;
    mocks.midiCallbacks.onNoteOff = undefined;
  });

  it("detects a C major chord from pressed piano keys", () => {
    render(<App />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
      pointerId: 1,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
      pointerId: 2,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
      pointerId: 3,
    });

    expect(screen.getByRole("heading", { name: "CM" })).toBeInTheDocument();
    expect(screen.getByText("C4 E4 G4")).toBeInTheDocument();
  });

  it("forms a mouse chord by latching clicked piano keys", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Latch mode" }));

    const c4 = screen.getByRole("button", { name: "C4" });
    const e4 = screen.getByRole("button", { name: "E4" });
    const g4 = screen.getByRole("button", { name: "G4" });

    fireEvent.pointerDown(c4, { pointerId: 1 });
    fireEvent.pointerUp(c4, { pointerId: 1 });
    fireEvent.pointerDown(e4, { pointerId: 2 });
    fireEvent.pointerUp(e4, { pointerId: 2 });
    fireEvent.pointerDown(g4, { pointerId: 3 });
    fireEvent.pointerUp(g4, { pointerId: 3 });

    expect(screen.getByRole("heading", { name: "CM" })).toBeInTheDocument();
    expect(screen.getByText("C4 E4 G4")).toBeInTheDocument();
    expect(c4).toHaveAttribute("aria-pressed", "true");
    expect(e4).toHaveAttribute("aria-pressed", "true");
    expect(g4).toHaveAttribute("aria-pressed", "true");

    fireEvent.pointerDown(c4, { pointerId: 4 });
    fireEvent.pointerUp(c4, { pointerId: 4 });

    expect(screen.getByText("E4 G4")).toBeInTheDocument();
    expect(c4).toHaveAttribute("aria-pressed", "false");
  });

  it("clears latched mouse notes when Space is pressed", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Latch mode" }));

    const c4 = screen.getByRole("button", { name: "C4" });
    const e4 = screen.getByRole("button", { name: "E4" });
    const g4 = screen.getByRole("button", { name: "G4" });

    fireEvent.pointerDown(c4, { pointerId: 1 });
    fireEvent.pointerUp(c4, { pointerId: 1 });
    fireEvent.pointerDown(e4, { pointerId: 2 });
    fireEvent.pointerUp(e4, { pointerId: 2 });
    fireEvent.pointerDown(g4, { pointerId: 3 });
    fireEvent.pointerUp(g4, { pointerId: 3 });

    expect(screen.getByText("C4 E4 G4")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: " " });

    expect(screen.queryByText("C4 E4 G4")).not.toBeInTheDocument();
    expect(c4).toHaveAttribute("aria-pressed", "false");
    expect(e4).toHaveAttribute("aria-pressed", "false");
    expect(g4).toHaveAttribute("aria-pressed", "false");
    expect(mocks.triggerRelease).toHaveBeenCalledWith(60);
    expect(mocks.triggerRelease).toHaveBeenCalledWith(64);
    expect(mocks.triggerRelease).toHaveBeenCalledWith(67);
  });

  it("releases synth audio only after the last source owner releases a note", () => {
    render(<App />);

    const c4 = screen.getByRole("button", { name: "C4" });
    fireEvent.pointerDown(c4, { pointerId: 1 });

    expect(mocks.triggerAttack).toHaveBeenCalledTimes(1);
    expect(mocks.triggerAttack).toHaveBeenLastCalledWith(60, 100);

    act(() => {
      mocks.midiCallbacks.onNoteOn?.({
        note: 60,
        velocity: 96,
        input: { id: "test-input", name: "Test MIDI", manufacturer: "Test" },
      });
    });

    expect(mocks.triggerAttack).toHaveBeenCalledTimes(2);
    expect(mocks.triggerAttack).toHaveBeenLastCalledWith(60, 96);

    fireEvent.pointerUp(c4, { pointerId: 1 });

    expect(mocks.triggerRelease).not.toHaveBeenCalled();
    expect(currentChordReadout().getByText("C4")).toBeInTheDocument();

    act(() => {
      mocks.midiCallbacks.onNoteOff?.({
        note: 60,
        input: { id: "test-input", name: "Test MIDI", manufacturer: "Test" },
      });
    });

    expect(mocks.triggerRelease).toHaveBeenCalledTimes(1);
    expect(mocks.triggerRelease).toHaveBeenLastCalledWith(60);
  });

  it("does not release synth audio when the source did not own the note", () => {
    render(<App />);

    act(() => {
      mocks.midiCallbacks.onNoteOff?.({
        note: 60,
        input: { id: "test-input", name: "Test MIDI", manufacturer: "Test" },
      });
    });

    expect(mocks.triggerRelease).not.toHaveBeenCalled();
  });

  it("releases synth audio exactly once when the final source owner releases", () => {
    render(
      <StrictMode>
        <App />
      </StrictMode>,
    );

    const c4 = screen.getByRole("button", { name: "C4" });
    fireEvent.pointerDown(c4, { pointerId: 1 });
    fireEvent.pointerUp(c4, { pointerId: 1 });

    expect(mocks.triggerRelease).toHaveBeenCalledTimes(1);
    expect(mocks.triggerRelease).toHaveBeenLastCalledWith(60);
  });

  it("releases synth audio once for duplicate note-up events before rerender", () => {
    render(<App />);

    act(() => {
      mocks.midiCallbacks.onNoteOn?.({
        note: 60,
        velocity: 96,
        input: { id: "test-input", name: "Test MIDI", manufacturer: "Test" },
      });
    });

    act(() => {
      mocks.midiCallbacks.onNoteOff?.({
        note: 60,
        input: { id: "test-input", name: "Test MIDI", manufacturer: "Test" },
      });
      mocks.midiCallbacks.onNoteOff?.({
        note: 60,
        input: { id: "test-input", name: "Test MIDI", manufacturer: "Test" },
      });
    });

    expect(mocks.triggerRelease).toHaveBeenCalledTimes(1);
    expect(mocks.triggerRelease).toHaveBeenLastCalledWith(60);
  });

  it("clears MIDI notes and releases synth audio when MIDI disconnects", () => {
    const { rerender } = render(<App />);

    act(() => {
      mocks.midiCallbacks.onNoteOn?.({
        note: 60,
        velocity: 96,
        input: { id: "test-input", name: "Test MIDI", manufacturer: "Test" },
      });
    });

    expect(currentChordReadout().getByText("C4")).toBeInTheDocument();
    expect(mocks.triggerAttack).toHaveBeenLastCalledWith(60, 96);

    mocks.midiStatus = "disconnected";
    mocks.midiInputs = [];
    rerender(<App />);

    expect(currentChordReadout().queryByText("C4")).not.toBeInTheDocument();
    expect(mocks.triggerRelease).toHaveBeenCalledTimes(1);
    expect(mocks.triggerRelease).toHaveBeenLastCalledWith(60);
  });

  it("clears MIDI ownership without releasing audio when pointer still holds the note", () => {
    const { rerender } = render(<App />);

    const c4 = screen.getByRole("button", { name: "C4" });
    fireEvent.pointerDown(c4, { pointerId: 1 });

    act(() => {
      mocks.midiCallbacks.onNoteOn?.({
        note: 60,
        velocity: 96,
        input: { id: "test-input", name: "Test MIDI", manufacturer: "Test" },
      });
    });

    mocks.midiStatus = "disconnected";
    mocks.midiInputs = [];
    rerender(<App />);

    expect(currentChordReadout().getByText("C4")).toBeInTheDocument();
    expect(mocks.triggerRelease).not.toHaveBeenCalled();
  });

  it("keeps audio active until the final MIDI input holding a shared note disconnects", () => {
    const inputA = { id: "input-a", name: "Input A", manufacturer: "Test" };
    const inputB = { id: "input-b", name: "Input B", manufacturer: "Test" };
    mocks.midiInputs = [inputA, inputB];
    const { rerender } = render(<App />);

    act(() => {
      mocks.midiCallbacks.onNoteOn?.({
        note: 60,
        velocity: 96,
        input: inputA,
      });
      mocks.midiCallbacks.onNoteOn?.({
        note: 60,
        velocity: 100,
        input: inputB,
      });
    });

    expect(currentChordReadout().getByText("C4")).toBeInTheDocument();

    mocks.midiStatus = "connected";
    mocks.midiInputs = [inputB];
    rerender(<App />);

    expect(currentChordReadout().getByText("C4")).toBeInTheDocument();
    expect(mocks.triggerRelease).not.toHaveBeenCalled();

    mocks.midiStatus = "disconnected";
    mocks.midiInputs = [];
    rerender(<App />);

    expect(currentChordReadout().queryByText("C4")).not.toBeInTheDocument();
    expect(mocks.triggerRelease).toHaveBeenCalledTimes(1);
    expect(mocks.triggerRelease).toHaveBeenLastCalledWith(60);
  });

  it("clears a note owned only by a removed MIDI input while another input remains connected", () => {
    const inputA = { id: "input-a", name: "Input A", manufacturer: "Test" };
    const inputB = { id: "input-b", name: "Input B", manufacturer: "Test" };
    mocks.midiInputs = [inputA, inputB];
    const { rerender } = render(<App />);

    act(() => {
      mocks.midiCallbacks.onNoteOn?.({
        note: 60,
        velocity: 96,
        input: inputA,
      });
    });

    mocks.midiStatus = "connected";
    mocks.midiInputs = [inputB];
    rerender(<App />);

    expect(currentChordReadout().queryByText("C4")).not.toBeInTheDocument();
    expect(mocks.triggerRelease).toHaveBeenCalledTimes(1);
    expect(mocks.triggerRelease).toHaveBeenLastCalledWith(60);
  });

  it("shows genre and key controls with starter suggestions", () => {
    render(<App />);

    expect(screen.getByLabelText("Progression genre")).toHaveValue("pop");
    expect(screen.getByLabelText("Progression key")).toHaveValue("C");
    expect(screen.getByLabelText("Key mode")).toHaveValue("major");
    expect(
      screen.getByRole("region", { name: "Progression compass" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I (C)" })).toBeInTheDocument();
  });

  it("updates starter ideas when key and mode change", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Progression key"), {
      target: { value: "D" },
    });
    fireEvent.change(screen.getByLabelText("Key mode"), {
      target: { value: "minor" },
    });

    expect(screen.getByRole("button", { name: "i (Dm)" })).toBeInTheDocument();
  });

  it("offers flat keys with musician-friendly labels", () => {
    render(<App />);

    fireEvent.change(screen.getByLabelText("Progression key"), {
      target: { value: "Bb" },
    });

    expect(screen.getByLabelText("Progression key")).toHaveValue("Bb");
    expect(screen.getByRole("button", { name: "I (Bb)" })).toBeInTheDocument();
  });

  it("uses a selected starter as the current compass node", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "I (C)" }));

    expect(screen.getByText("You are here")).toBeInTheDocument();
    expect(screen.getAllByText("I (C)").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "vi (Am)" })).toBeInTheDocument();
  });

  it("resets selected starter before changing mode", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "I (C)" }));

    expect(() => {
      fireEvent.change(screen.getByLabelText("Key mode"), {
        target: { value: "minor" },
      });
    }).not.toThrow();
    expect(screen.getByRole("button", { name: "i (Cm)" })).toBeInTheDocument();
  });

  it("selects a suggested target, confirms a matching inversion, and advances", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
        pointerId: 1,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 2,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
        pointerId: 3,
      });

      expect(screen.getByText("You are here")).toBeInTheDocument();
      expect(screen.getAllByText("I (C)").length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole("button", { name: "vi (Am)" }));

      fireEvent.pointerUp(screen.getByRole("button", { name: "C4" }), {
        pointerId: 1,
      });
      fireEvent.pointerUp(screen.getByRole("button", { name: "E4" }), {
        pointerId: 2,
      });
      fireEvent.pointerUp(screen.getByRole("button", { name: "G4" }), {
        pointerId: 3,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 4,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "A4" }), {
        pointerId: 5,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "C5" }), {
        pointerId: 6,
      });

      expect(screen.getByRole("button", { name: "vi (Am)" })).toHaveAttribute(
        "data-matched",
        "true",
      );

      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.getAllByText("vi (Am)").length).toBeGreaterThan(0);
      expect(
        screen.queryByRole("button", { name: "vi (Am)" }),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("updates the current compass node when any graph chord is played", () => {
    render(<App />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
      pointerId: 1,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
      pointerId: 2,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
      pointerId: 3,
    });

    expect(screen.getByRole("heading", { name: "I (C)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "vi (Am)" })).toBeInTheDocument();

    fireEvent.pointerUp(screen.getByRole("button", { name: "C4" }), {
      pointerId: 1,
    });
    fireEvent.pointerUp(screen.getByRole("button", { name: "E4" }), {
      pointerId: 2,
    });
    fireEvent.pointerUp(screen.getByRole("button", { name: "G4" }), {
      pointerId: 3,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "D4" }), {
      pointerId: 4,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "F4" }), {
      pointerId: 5,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "A4" }), {
      pointerId: 6,
    });

    expect(screen.getByRole("heading", { name: "ii (Dm)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "V7 (G7)" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "vi (Am)" }),
    ).not.toBeInTheDocument();
  });

  it("clears stale compass suggestions for detected chords outside the graph", () => {
    render(<App />);

    fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
      pointerId: 1,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
      pointerId: 2,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
      pointerId: 3,
    });

    expect(screen.getByRole("heading", { name: "I (C)" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "vi (Am)" })).toBeInTheDocument();

    fireEvent.pointerUp(screen.getByRole("button", { name: "C4" }), {
      pointerId: 1,
    });
    fireEvent.pointerUp(screen.getByRole("button", { name: "E4" }), {
      pointerId: 2,
    });
    fireEvent.pointerUp(screen.getByRole("button", { name: "G4" }), {
      pointerId: 3,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "C#4" }), {
      pointerId: 4,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "F4" }), {
      pointerId: 5,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "G#4" }), {
      pointerId: 6,
    });

    expect(
      screen.getByText("No curated moves for this chord in this genre yet."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "vi (Am)" }),
    ).not.toBeInTheDocument();
  });

  it("advances a matched suggestion after notes are released", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
        pointerId: 1,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 2,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
        pointerId: 3,
      });

      fireEvent.click(screen.getByRole("button", { name: "vi (Am)" }));

      fireEvent.pointerUp(screen.getByRole("button", { name: "C4" }), {
        pointerId: 1,
      });
      fireEvent.pointerUp(screen.getByRole("button", { name: "E4" }), {
        pointerId: 2,
      });
      fireEvent.pointerUp(screen.getByRole("button", { name: "G4" }), {
        pointerId: 3,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 4,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "A4" }), {
        pointerId: 5,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "C5" }), {
        pointerId: 6,
      });

      expect(screen.getByRole("button", { name: "vi (Am)" })).toHaveAttribute(
        "data-matched",
        "true",
      );

      fireEvent.pointerUp(screen.getByRole("button", { name: "E4" }), {
        pointerId: 4,
      });
      fireEvent.pointerUp(screen.getByRole("button", { name: "A4" }), {
        pointerId: 5,
      });
      fireEvent.pointerUp(screen.getByRole("button", { name: "C5" }), {
        pointerId: 6,
      });

      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.getByRole("heading", { name: "vi (Am)" })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "vi (Am)" }),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not let a pending match override a newer played graph chord", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
        pointerId: 1,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 2,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
        pointerId: 3,
      });

      fireEvent.click(screen.getByRole("button", { name: "vi (Am)" }));

      fireEvent.pointerUp(screen.getByRole("button", { name: "C4" }), {
        pointerId: 1,
      });
      fireEvent.pointerUp(screen.getByRole("button", { name: "E4" }), {
        pointerId: 2,
      });
      fireEvent.pointerUp(screen.getByRole("button", { name: "G4" }), {
        pointerId: 3,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 4,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "A4" }), {
        pointerId: 5,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "C5" }), {
        pointerId: 6,
      });

      expect(screen.getByRole("button", { name: "vi (Am)" })).toHaveAttribute(
        "data-matched",
        "true",
      );

      fireEvent.pointerUp(screen.getByRole("button", { name: "E4" }), {
        pointerId: 4,
      });
      fireEvent.pointerUp(screen.getByRole("button", { name: "A4" }), {
        pointerId: 5,
      });
      fireEvent.pointerUp(screen.getByRole("button", { name: "C5" }), {
        pointerId: 6,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "D4" }), {
        pointerId: 7,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "F4" }), {
        pointerId: 8,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "A4" }), {
        pointerId: 9,
      });

      expect(screen.getByRole("heading", { name: "ii (Dm)" })).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.getByRole("heading", { name: "ii (Dm)" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "V7 (G7)" })).toBeInTheDocument();
      expect(
        screen.queryByRole("button", { name: "vi (Am)" }),
      ).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not add selected suggestions to the recent progression before they are played", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "vi (Am)" }));

    expect(
      within(
        screen.getByRole("region", { name: "Recent progression" }),
      ).queryByText("Am"),
    ).not.toBeInTheDocument();
  });
});
