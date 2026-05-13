import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MOBILE_PIANO_RANGE } from "../../music/notes";
import { ScaleLearningPanel } from "../ScaleLearningPanel";

function renderPanel(
  props: Partial<React.ComponentProps<typeof ScaleLearningPanel>> = {},
) {
  const onTargetChange = vi.fn();

  const view = render(
    <ScaleLearningPanel
      activePitchClasses={[]}
      appKeyRoot="C"
      onTargetChange={onTargetChange}
      {...props}
    />,
  );

  return { onTargetChange, ...view };
}

describe("ScaleLearningPanel", () => {
  it("renders the default scale detail with piano map and staff notation", () => {
    renderPanel();

    expect(
      screen.getByRole("region", { name: "Scale learning" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Core" })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Pentatonic & blues" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Modes" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Symmetric" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Major" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("heading", { name: "Major" })).toBeInTheDocument();
    expect(screen.getByText("C major")).toBeInTheDocument();
    expect(screen.getByText("C D E F G A B")).toBeInTheDocument();
    expect(screen.getByText("1 2 3 4 5 6 7")).toBeInTheDocument();
    expect(screen.getByText("W W H W W W H")).toBeInTheDocument();
    expect(screen.getByLabelText("Mini piano map for C major")).toBeInTheDocument();
    expect(
      screen.getByLabelText("Treble clef staff notation for C major"),
    ).toBeInTheDocument();
    expect(screen.getByText("Play all scale notes")).toBeInTheDocument();
  });

  it("selects another scale type and updates the note list", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Minor pentatonic" }));

    expect(
      screen.getByRole("heading", { name: "Minor pentatonic" }),
    ).toBeInTheDocument();
    expect(screen.getByText("C Eb F G Bb")).toBeInTheDocument();
    expect(screen.getByText("1 b3 4 5 b7")).toBeInTheDocument();
  });

  it("uses conventional display spelling when the root changes to Bb", () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText("Scale root"), {
      target: { value: "Bb" },
    });

    expect(screen.getByText("Bb major")).toBeInTheDocument();
    expect(screen.getByText("Bb C D Eb F G A")).toBeInTheDocument();
  });

  it("marks the selected scale as matched when active notes equal the target", () => {
    renderPanel({ activePitchClasses: ["G", "E", "C", "B", "D", "F", "A"] });

    expect(screen.getByText("Matched")).toBeInTheDocument();
  });

  it("reports the selected scale MIDI target to the app", () => {
    const { onTargetChange } = renderPanel({ targetRange: MOBILE_PIANO_RANGE });

    expect(onTargetChange).toHaveBeenLastCalledWith([48, 50, 52, 53, 55, 57, 59]);

    fireEvent.click(screen.getByRole("button", { name: "Minor pentatonic" }));

    expect(onTargetChange).toHaveBeenLastCalledWith([48, 51, 53, 55, 58]);
  });
});
