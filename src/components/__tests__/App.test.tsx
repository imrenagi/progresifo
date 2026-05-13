import {
  act,
  createEvent,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../App";

const originalMatchMedia = window.matchMedia;

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

function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

describe("App", () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.localStorage.setItem("progresifo.onboardingDismissed", "true");
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

  afterEach(() => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
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

  it("shows first-run onboarding and persists dismissal", () => {
    window.localStorage.removeItem("progresifo.onboardingDismissed");

    render(<App />);

    const onboarding = screen.getByRole("dialog", {
      name: "Welcome to Progresifo",
    });

    expect(onboarding).toBeInTheDocument();
    expect(
      within(onboarding).getByText("Connect your MIDI controller"),
    ).toBeInTheDocument();
    expect(
      within(onboarding).getByText("Choose Hold or Latch"),
    ).toBeInTheDocument();
    expect(
      within(onboarding).getByText("Control browser sound"),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-onboarding-target="interaction-mode"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-onboarding-target="midi-status"]'),
    ).toBeInTheDocument();
    expect(
      document.querySelector('[data-onboarding-target="sound-toggle"]'),
    ).toBeInTheDocument();

    fireEvent.click(
      within(onboarding).getByRole("button", { name: "Start practicing" }),
    );

    expect(
      screen.queryByRole("dialog", { name: "Welcome to Progresifo" }),
    ).not.toBeInTheDocument();
    expect(window.localStorage.getItem("progresifo.onboardingDismissed")).toBe(
      "true",
    );
  });

  it("skips onboarding after it has been dismissed", () => {
    window.localStorage.setItem("progresifo.onboardingDismissed", "true");

    render(<App />);

    expect(
      screen.queryByRole("dialog", { name: "Welcome to Progresifo" }),
    ).not.toBeInTheDocument();
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

    expect(
      screen.getByRole("tab", { name: "Progressions" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Progression genre")).toHaveValue("pop");
    expect(screen.getByLabelText("Progression key")).toHaveValue("C");
    expect(screen.getByLabelText("Key mode")).toHaveValue("major");
    expect(
      screen.getByRole("region", { name: "Progression compass" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I (C)" })).toBeInTheDocument();
  });

  it("switches between progressions and chord construction workspaces", () => {
    render(<App />);

    const progressionsTab = screen.getByRole("tab", { name: "Progressions" });
    const chordConstructionTab = screen.getByRole("tab", {
      name: "Chord Construction",
    });
    expect(progressionsTab).toHaveAttribute("id", "workspace-tab-progressions");
    expect(progressionsTab).toHaveAttribute(
      "aria-controls",
      "workspace-panel-progressions",
    );
    expect(chordConstructionTab).toHaveAttribute(
      "id",
      "workspace-tab-chord-construction",
    );
    expect(chordConstructionTab).toHaveAttribute(
      "aria-controls",
      "workspace-panel-chord-construction",
    );
    expect(
      document.getElementById(progressionsTab.getAttribute("aria-controls") ?? ""),
    ).toBeInTheDocument();
    expect(
      document.getElementById(
        chordConstructionTab.getAttribute("aria-controls") ?? "",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      "workspace-tab-progressions",
    );
    expect(
      screen.getByRole("region", { name: "Progression compass" }),
    ).toBeInTheDocument();

    fireEvent.click(chordConstructionTab);

    expect(screen.getByRole("tabpanel")).toHaveAttribute(
      "aria-labelledby",
      "workspace-tab-chord-construction",
    );
    expect(
      screen.getByRole("region", { name: "Chord construction" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Progression compass" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("region", { name: "Recent progression" }),
    ).not.toBeInTheDocument();

    fireEvent.click(progressionsTab);

    expect(
      screen.getByRole("region", { name: "Progression compass" }),
    ).toBeInTheDocument();
  });

  it("supports roving keyboard navigation for workspace tabs", () => {
    render(<App />);

    const progressionsTab = screen.getByRole("tab", { name: "Progressions" });
    const chordConstructionTab = screen.getByRole("tab", {
      name: "Chord Construction",
    });

    expect(progressionsTab).toHaveAttribute("tabIndex", "0");
    expect(chordConstructionTab).toHaveAttribute("tabIndex", "-1");

    progressionsTab.focus();
    fireEvent.keyDown(progressionsTab, { key: "ArrowRight" });

    expect(chordConstructionTab).toHaveFocus();
    expect(chordConstructionTab).toHaveAttribute("aria-selected", "true");
    expect(chordConstructionTab).toHaveAttribute("tabIndex", "0");
    expect(progressionsTab).toHaveAttribute("tabIndex", "-1");

    fireEvent.keyDown(chordConstructionTab, { key: "ArrowLeft" });

    expect(progressionsTab).toHaveFocus();
    expect(progressionsTab).toHaveAttribute("aria-selected", "true");

    const arrowDownEvent = createEvent.keyDown(progressionsTab, {
      key: "ArrowDown",
    });
    fireEvent(progressionsTab, arrowDownEvent);

    expect(arrowDownEvent.defaultPrevented).toBe(true);
    expect(chordConstructionTab).toHaveFocus();
    expect(chordConstructionTab).toHaveAttribute("aria-selected", "true");

    const arrowUpEvent = createEvent.keyDown(chordConstructionTab, {
      key: "ArrowUp",
    });
    fireEvent(chordConstructionTab, arrowUpEvent);

    expect(arrowUpEvent.defaultPrevented).toBe(true);
    expect(progressionsTab).toHaveFocus();
    expect(progressionsTab).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(progressionsTab, { key: "End" });

    expect(chordConstructionTab).toHaveFocus();
    expect(chordConstructionTab).toHaveAttribute("aria-selected", "true");

    fireEvent.keyDown(chordConstructionTab, { key: "Home" });

    expect(progressionsTab).toHaveFocus();
    expect(progressionsTab).toHaveAttribute("aria-selected", "true");
  });

  it("does not add chord construction notes to the recent progression trail", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Chord Construction" }));

    fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
      pointerId: 1,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
      pointerId: 2,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
      pointerId: 3,
    });

    expect(screen.getByText("Matched")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Progressions" }));

    const recentProgression = within(
      screen.getByRole("region", { name: "Recent progression" }),
    );
    expect(
      recentProgression.getByText("Detected chords will appear here."),
    ).toBeInTheDocument();
    expect(recentProgression.queryByText("CM")).not.toBeInTheDocument();
  });

  it("does not update compass context from chord construction notes", () => {
    render(<App />);

    expect(
      screen.getByRole("heading", { name: "Choose a first chord" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I (C)" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Chord Construction" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
      pointerId: 1,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
      pointerId: 2,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
      pointerId: 3,
    });

    fireEvent.click(screen.getByRole("tab", { name: "Progressions" }));

    expect(
      screen.getByRole("heading", { name: "Choose a first chord" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I (C)" })).toBeInTheDocument();
  });

  it("preserves selected compass suggestion across unsupported chord construction notes", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "I (C)" }));
    fireEvent.click(screen.getByRole("button", { name: "V7 (G7)" }));

    expect(screen.getByRole("button", { name: "V7 (G7)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "V7 (G7)" })).toHaveAttribute(
      "data-selected",
      "true",
    );

    fireEvent.click(screen.getByRole("tab", { name: "Chord Construction" }));
    fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
      pointerId: 1,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "D4" }), {
      pointerId: 2,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "F#4" }), {
      pointerId: 3,
    });

    fireEvent.click(screen.getByRole("tab", { name: "Progressions" }));

    expect(screen.getByRole("button", { name: "V7 (G7)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "V7 (G7)" })).toHaveAttribute(
      "data-selected",
      "true",
    );
  });

  it("does not advance hidden full progression practice from chord construction notes", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));
      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAttribute(
        "aria-current",
        "step",
      );

      fireEvent.click(screen.getByRole("tab", { name: "Chord Construction" }));
      fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
        pointerId: 1,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 2,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
        pointerId: 3,
      });

      act(() => {
        vi.advanceTimersByTime(650);
      });

      fireEvent.click(screen.getByRole("tab", { name: "Progressions" }));

      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAttribute(
        "aria-current",
        "step",
      );
      expect(screen.getByRole("button", { name: "2 V7 (G7)" })).not.toHaveAttribute(
        "aria-current",
        "step",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses chord construction targets as piano hints and confirms matches", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Chord Construction" }));
    fireEvent.click(screen.getByRole("button", { name: "Dominant seventh" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "In this scale" })).getByRole(
        "button",
        { name: /G7/ },
      ),
    );

    expect(screen.getByRole("button", { name: "G4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "B4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "D5" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "F5" })).toHaveAttribute(
      "data-hinted",
      "true",
    );

    fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
      pointerId: 1,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "B4" }), {
      pointerId: 2,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "D5" }), {
      pointerId: 3,
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "F5" }), {
      pointerId: 4,
    });

    expect(screen.getByText("Matched")).toBeInTheDocument();
  });

  it("uses mobile-range chord construction hints without referencing unrendered keys", () => {
    mockMatchMedia(true);
    render(<App />);

    fireEvent.click(screen.getByRole("tab", { name: "Chord Construction" }));
    fireEvent.click(screen.getByRole("button", { name: "Dominant seventh" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "In this scale" })).getByRole(
        "button",
        { name: /G7/ },
      ),
    );

    expect(screen.getByText("Target notes: D3 F3 G3 B3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "D3" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "F3" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "G3" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "B3" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "D4" })).not.toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "F4" })).not.toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.queryByRole("button", { name: "D5" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "F5" })).not.toBeInTheDocument();
    screen.getAllByRole("button").forEach((button) => {
      const noteName = button.getAttribute("aria-label");

      if (button.getAttribute("data-hinted") === "true") {
        expect(["D3", "F3", "G3", "B3"]).toContain(noteName);
      }
    });
  });

  it("toggles from next moves to full progressions", () => {
    render(<App />);

    expect(screen.getByRole("button", { name: "Next moves" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));

    expect(screen.getByRole("button", { name: "Next moves" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(
      screen.queryByRole("region", { name: "Progression compass" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("region", { name: "Full progressions" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Axis Progression" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("I (C) - V7 (G7) - vi (Am) - IV (F)")).toBeInTheDocument();

    const firstStep = screen.getByRole("button", { name: "1 I (C)" });
    expect(firstStep).toHaveAttribute("aria-current", "step");
    expect(firstStep).toHaveAccessibleDescription("C4 E4 G4");
  });

  it("uses the active full progression step as the piano hint", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));

    expect(screen.getByRole("button", { name: "C4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "E4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "G4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "2 V7 (G7)" }));

    expect(screen.getByRole("button", { name: "C4" })).toHaveAttribute(
      "data-hinted",
      "false",
    );
    expect(screen.getByRole("button", { name: "E4" })).toHaveAttribute(
      "data-hinted",
      "false",
    );
    expect(screen.getByRole("button", { name: "G4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "B4" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "D5" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
    expect(screen.getByRole("button", { name: "F5" })).toHaveAttribute(
      "data-hinted",
      "true",
    );
  });

  it("auto-advances the active full progression step after a matching chord", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));
      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAttribute(
        "aria-current",
        "step",
      );

      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 1,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
        pointerId: 2,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "C5" }), {
        pointerId: 3,
      });

      const firstStep = screen.getByRole("button", { name: "1 I (C)" });
      expect(firstStep).toHaveAccessibleDescription(/C4 E4 G4.*Matched/);

      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.getByRole("button", { name: "2 V7 (G7)" })).toHaveAttribute(
        "aria-current",
        "step",
      );
      expect(
        screen.getByRole("button", { name: "1 I (C)" }),
      ).toHaveAccessibleDescription("C4 E4 G4");
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not repeatedly advance while the same matching chord remains held", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));
      fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
        pointerId: 1,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 2,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
        pointerId: 3,
      });

      act(() => {
        vi.advanceTimersByTime(650);
      });
      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.getByRole("button", { name: "2 V7 (G7)" })).toHaveAttribute(
        "aria-current",
        "step",
      );
      expect(screen.getByRole("button", { name: "3 vi (Am)" })).not.toHaveAttribute(
        "aria-current",
        "step",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("keeps confirming when active notes change but pitch classes stay matched", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));

      fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
        pointerId: 1,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 2,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
        pointerId: 3,
      });

      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAccessibleDescription(
        /C4 E4 G4.*Matched/,
      );

      fireEvent.pointerDown(screen.getByRole("button", { name: "C5" }), {
        pointerId: 4,
      });

      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAccessibleDescription(
        /C4 E4 G4.*Matched/,
      );

      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.getByRole("button", { name: "2 V7 (G7)" })).toHaveAttribute(
        "aria-current",
        "step",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("clears a canceled full progression match when notes are released before confirmation", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));

      const c4 = screen.getByRole("button", { name: "C4" });
      const e4 = screen.getByRole("button", { name: "E4" });
      const g4 = screen.getByRole("button", { name: "G4" });

      fireEvent.pointerDown(c4, { pointerId: 1 });
      fireEvent.pointerDown(e4, { pointerId: 2 });
      fireEvent.pointerDown(g4, { pointerId: 3 });

      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAccessibleDescription(
        /C4 E4 G4.*Matched/,
      );

      fireEvent.pointerUp(g4, { pointerId: 3 });

      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAccessibleDescription(
        "C4 E4 G4",
      );

      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAttribute(
        "aria-current",
        "step",
      );
      expect(screen.getByRole("button", { name: "2 V7 (G7)" })).not.toHaveAttribute(
        "aria-current",
        "step",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("marks completion after the final full progression step and loops to the first step", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));
      fireEvent.click(screen.getByRole("button", { name: "4 IV (F)" }));

      fireEvent.pointerDown(screen.getByRole("button", { name: "F4" }), {
        pointerId: 1,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "A4" }), {
        pointerId: 2,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "C5" }), {
        pointerId: 3,
      });

      const finalStep = screen.getByRole("button", { name: "4 IV (F)" });
      expect(finalStep).toHaveAccessibleDescription(/F4 A4 C5.*Matched/);
      expect(screen.queryByText("Progression complete")).not.toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.getByText("Progression complete")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAttribute(
        "aria-current",
        "step",
      );

      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.queryByText("Progression complete")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAttribute(
        "aria-current",
        "step",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not rematch the first step after looping while the final tonic remains held", () => {
    vi.useFakeTimers();

    try {
      render(<App />);

      fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));
      fireEvent.click(screen.getByRole("button", { name: "Lift Progression" }));
      fireEvent.click(screen.getByRole("button", { name: "4 I (C)" }));

      fireEvent.pointerDown(screen.getByRole("button", { name: "C4" }), {
        pointerId: 1,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "E4" }), {
        pointerId: 2,
      });
      fireEvent.pointerDown(screen.getByRole("button", { name: "G4" }), {
        pointerId: 3,
      });

      expect(screen.getByRole("button", { name: "4 I (C)" })).toHaveAccessibleDescription(
        /C4 E4 G4.*Matched/,
      );

      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.getByText("Progression complete")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAttribute(
        "aria-current",
        "step",
      );
      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAccessibleDescription(
        "C4 E4 G4",
      );

      act(() => {
        vi.advanceTimersByTime(650);
      });

      expect(screen.queryByText("Progression complete")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAttribute(
        "aria-current",
        "step",
      );
      expect(screen.getByRole("button", { name: "2 IV (F)" })).not.toHaveAttribute(
        "aria-current",
        "step",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not auto-advance full progression steps while in next moves mode", () => {
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

      act(() => {
        vi.advanceTimersByTime(650);
      });

      fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));

      expect(screen.getByRole("button", { name: "1 I (C)" })).toHaveAttribute(
        "aria-current",
        "step",
      );
      expect(screen.getByRole("button", { name: "2 V7 (G7)" })).not.toHaveAttribute(
        "aria-current",
        "step",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("resets selected full progression when key mode changes", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));
    fireEvent.change(screen.getByLabelText("Key mode"), {
      target: { value: "minor" },
    });

    expect(screen.getByRole("button", { name: "Minor Loop" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    const firstStep = screen.getByRole("button", { name: "1 i (Cm)" });
    expect(firstStep).toHaveAttribute("aria-current", "step");
    expect(firstStep).toHaveAccessibleDescription("C4 D#4 G4");
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

  it("does not add selected full progression steps to the recent progression before they are played", () => {
    render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Full progressions" }));
    fireEvent.click(screen.getByRole("button", { name: "Lift Progression" }));
    fireEvent.click(screen.getByRole("button", { name: "2 IV (F)" }));

    const recentProgression = within(
      screen.getByRole("region", { name: "Recent progression" }),
    );

    expect(recentProgression.queryByText("C")).not.toBeInTheDocument();
    expect(recentProgression.queryByText("F")).not.toBeInTheDocument();
  });
});
