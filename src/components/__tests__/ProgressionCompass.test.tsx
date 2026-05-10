import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProgressionCompass } from "../ProgressionCompass";
import type { CompassNodeView, ProgressionSuggestion } from "../../music/types";

const starter: ProgressionSuggestion = {
  id: "starter:I",
  nodeId: "I",
  romanNumeral: "I",
  chordName: "C",
  displayName: "I (C)",
  difficulty: "basic",
  functionLabel: "common",
  reason: "Use this as a starting point for the selected genre and key.",
  target: {
    noteNames: ["C4", "E4", "G4"],
    midiNumbers: [60, 64, 67],
    pitchClasses: ["C", "E", "G"],
  },
};

const current: CompassNodeView = {
  nodeId: "I",
  romanNumeral: "I",
  chordName: "C",
  displayName: "I (C)",
};

const next: ProgressionSuggestion = {
  ...starter,
  id: "vi:common",
  nodeId: "vi",
  romanNumeral: "vi",
  chordName: "Am",
  displayName: "vi (Am)",
  reason: "vi keeps the harmony familiar while changing color.",
  target: {
    noteNames: ["A3", "C4", "E4"],
    midiNumbers: [57, 60, 64],
    pitchClasses: ["A", "C", "E"],
  },
};

describe("ProgressionCompass", () => {
  it("renders starter ideas before an active node exists", () => {
    render(
      <ProgressionCompass
        currentNode={null}
        matchedSuggestionId={null}
        onSuggestionSelect={vi.fn()}
        selectedSuggestionId="starter:I"
        suggestions={[starter]}
      />,
    );

    expect(screen.getByRole("region", { name: "Progression compass" })).toBeInTheDocument();
    expect(screen.getByText("Starter ideas")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I (C)" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByText("Press C4 E4 G4")).toBeInTheDocument();
  });

  it("renders active next moves and selection", () => {
    const onSuggestionSelect = vi.fn();

    render(
      <ProgressionCompass
        currentNode={current}
        matchedSuggestionId={null}
        onSuggestionSelect={onSuggestionSelect}
        selectedSuggestionId={next.id}
        suggestions={[next]}
      />,
    );

    expect(screen.getByText("You are here")).toBeInTheDocument();
    expect(screen.getByText("I (C)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "vi (Am)" }));

    expect(onSuggestionSelect).toHaveBeenCalledWith(next.id);
  });

  it("marks a matched suggestion", () => {
    render(
      <ProgressionCompass
        currentNode={current}
        matchedSuggestionId={next.id}
        onSuggestionSelect={vi.fn()}
        selectedSuggestionId={next.id}
        suggestions={[next]}
      />,
    );

    expect(screen.getByRole("button", { name: "vi (Am)" })).toHaveAttribute(
      "data-matched",
      "true",
    );
  });
});
