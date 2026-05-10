import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ProgressionPracticeRail } from "../ProgressionPracticeRail";
import type { ResolvedProgression } from "../../music/types";

const axis: ResolvedProgression = {
  id: "pop-axis",
  name: "Axis Progression",
  displaySequence: "I (C) - V7 (G7) - vi (Am) - IV (F)",
  description: "A familiar four-chord loop for modern pop practice.",
  steps: [
    {
      nodeId: "I",
      romanNumeral: "I",
      chordName: "C",
      displayName: "I (C)",
      target: {
        noteNames: ["C4", "E4", "G4"],
        midiNumbers: [60, 64, 67],
        pitchClasses: ["C", "E", "G"],
      },
    },
    {
      nodeId: "V7",
      romanNumeral: "V7",
      chordName: "G7",
      displayName: "V7 (G7)",
      target: {
        noteNames: ["G4", "B4", "D5", "F5"],
        midiNumbers: [67, 71, 74, 77],
        pitchClasses: ["G", "B", "D", "F"],
      },
    },
  ],
};

const lift: ResolvedProgression = {
  ...axis,
  id: "pop-lift",
  name: "Lift Progression",
  displaySequence: "I (C) - IV (F) - V7 (G7) - I (C)",
};

describe("ProgressionPracticeRail", () => {
  it("renders progression cards and selected practice steps", () => {
    render(
      <ProgressionPracticeRail
        activeStepIndex={0}
        isComplete={false}
        matchedStepIndex={null}
        onProgressionSelect={vi.fn()}
        onStepSelect={vi.fn()}
        progressions={[axis, lift]}
        selectedProgression={axis}
      />,
    );

    expect(screen.getByRole("region", { name: "Full progressions" })).toBeInTheDocument();
    const axisCard = screen.getByRole("button", { name: "Axis Progression" });
    expect(axisCard).toHaveAttribute("aria-pressed", "true");
    expect(axisCard).toHaveAccessibleDescription(
      /I \(C\) - V7 \(G7\) - vi \(Am\) - IV \(F\).*modern pop practice/,
    );

    const liftCard = screen.getByRole("button", { name: "Lift Progression" });
    expect(liftCard).toHaveAttribute("aria-pressed", "false");
    expect(liftCard).toHaveAccessibleDescription(
      /I \(C\) - IV \(F\) - V7 \(G7\) - I \(C\)/,
    );

    const rail = screen.getByRole("list", { name: "Practice steps" });
    expect(within(rail).getByText("I (C)")).toBeInTheDocument();
    expect(within(rail).getByText("C4 E4 G4")).toBeInTheDocument();
    expect(within(rail).getByText("V7 (G7)")).toBeInTheDocument();
    expect(within(rail).getByText("G4 B4 D5 F5")).toBeInTheDocument();
  });

  it("calls selection handlers for progression cards and rail steps", () => {
    const onProgressionSelect = vi.fn();
    const onStepSelect = vi.fn();

    render(
      <ProgressionPracticeRail
        activeStepIndex={0}
        isComplete={false}
        matchedStepIndex={null}
        onProgressionSelect={onProgressionSelect}
        onStepSelect={onStepSelect}
        progressions={[axis, lift]}
        selectedProgression={axis}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Lift Progression" }));
    expect(onProgressionSelect).toHaveBeenCalledWith("pop-lift");

    const secondStep = screen.getByRole("button", { name: "2 V7 (G7)" });
    expect(secondStep).toHaveAccessibleDescription("G4 B4 D5 F5");

    fireEvent.click(secondStep);
    expect(onStepSelect).toHaveBeenCalledWith(1);
  });

  it("marks active, matched, and complete states", () => {
    render(
      <ProgressionPracticeRail
        activeStepIndex={1}
        isComplete={true}
        matchedStepIndex={0}
        onProgressionSelect={vi.fn()}
        onStepSelect={vi.fn()}
        progressions={[axis]}
        selectedProgression={axis}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Progression complete");

    const matchedStep = screen.getByRole("button", { name: "1 I (C)" });
    expect(matchedStep).toHaveAccessibleDescription(/C4 E4 G4.*Matched/);
    expect(within(matchedStep).getByText("Matched")).toBeInTheDocument();

    const activeStep = screen.getByRole("button", { name: "2 V7 (G7)" });
    expect(activeStep).toHaveAttribute("aria-current", "step");
    expect(activeStep).toHaveAccessibleDescription("G4 B4 D5 F5");
  });

  it("renders an empty state without progressions", () => {
    render(
      <ProgressionPracticeRail
        activeStepIndex={0}
        isComplete={false}
        matchedStepIndex={null}
        onProgressionSelect={vi.fn()}
        onStepSelect={vi.fn()}
        progressions={[]}
        selectedProgression={null}
      />,
    );

    expect(screen.getByText("No curated full progressions for this selection yet.")).toBeInTheDocument();
  });
});
