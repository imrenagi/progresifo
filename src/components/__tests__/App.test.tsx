import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";

const mocks = vi.hoisted(() => ({
  connectMidi: vi.fn(),
  disableAudio: vi.fn(),
  enableAudio: vi.fn(),
  triggerAttack: vi.fn(),
  triggerRelease: vi.fn(),
  midiCallbacks: {} as {
    onNoteOn?: (event: { note: number; velocity?: number }) => void;
    onNoteOff?: (event: { note: number }) => void;
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
      status: "connected",
      inputs: [{ id: "test-input", name: "Test MIDI", manufacturer: "Test" }],
      error: null,
      connect: mocks.connectMidi,
    };
  },
}));

describe("App", () => {
  beforeEach(() => {
    mocks.connectMidi.mockClear();
    mocks.disableAudio.mockClear();
    mocks.enableAudio.mockClear();
    mocks.triggerAttack.mockClear();
    mocks.triggerRelease.mockClear();
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

  it("releases synth audio only after the last source owner releases a note", () => {
    render(<App />);

    const c4 = screen.getByRole("button", { name: "C4" });
    fireEvent.pointerDown(c4, { pointerId: 1 });

    expect(mocks.triggerAttack).toHaveBeenCalledTimes(1);
    expect(mocks.triggerAttack).toHaveBeenLastCalledWith(60, 100);

    act(() => {
      mocks.midiCallbacks.onNoteOn?.({ note: 60, velocity: 96 });
    });

    expect(mocks.triggerAttack).toHaveBeenCalledTimes(2);
    expect(mocks.triggerAttack).toHaveBeenLastCalledWith(60, 96);

    fireEvent.pointerUp(c4, { pointerId: 1 });

    expect(mocks.triggerRelease).not.toHaveBeenCalled();
    expect(screen.getByText("C4")).toBeInTheDocument();

    act(() => {
      mocks.midiCallbacks.onNoteOff?.({ note: 60 });
    });

    expect(mocks.triggerRelease).toHaveBeenCalledTimes(1);
    expect(mocks.triggerRelease).toHaveBeenLastCalledWith(60);
  });
});
