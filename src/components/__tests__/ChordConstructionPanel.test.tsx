import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MOBILE_PIANO_RANGE } from "../../music/notes";
import { ChordConstructionPanel } from "../ChordConstructionPanel";

function renderPanel(
  props: Partial<React.ComponentProps<typeof ChordConstructionPanel>> = {},
) {
  const onTargetChange = vi.fn();

  const view = render(
    <ChordConstructionPanel
      activePitchClasses={[]}
      appKeyMode="major"
      appKeyRoot="C"
      onTargetChange={onTargetChange}
      {...props}
    />,
  );

  return { onTargetChange, ...view };
}

describe("ChordConstructionPanel", () => {
  it("renders chord construction defaults and teaching sections", () => {
    renderPanel();

    expect(
      screen.getByRole("region", { name: "Chord construction" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Triads" })).toBeInTheDocument();
    expect(
      screen.getByRole("group", { name: "Suspended & add" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Sixths" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Sevenths" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Extended" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Altered" })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: "Major" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Major" })).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(screen.getByText("Formula")).toBeInTheDocument();
    expect(screen.getByText("1 3 5")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "When to use it" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How it feels" })).toBeInTheDocument();
  });

  it("targets the active root when selecting a chord type", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /Dominant seventh/ }));

    expect(
      screen.getByRole("heading", { name: "Dominant seventh" }),
    ).toBeInTheDocument();
    expect(screen.getByText("1 3 5 b7")).toBeInTheDocument();
    expect(
      screen.getByText("Tense, bluesy, directional, wants to resolve."),
    ).toBeInTheDocument();
    expect(screen.getByText("Target notes: C4 E4 G4 A#4")).toBeInTheDocument();
  });

  it("selects an in-scale example and reports its MIDI target", () => {
    const { onTargetChange } = renderPanel();

    fireEvent.click(screen.getByRole("button", { name: /Dominant seventh/ }));
    const inScaleGroup = screen.getByRole("group", { name: "In this scale" });

    fireEvent.click(within(inScaleGroup).getByRole("button", { name: /G7/ }));

    expect(screen.getByText("Target notes: G4 B4 D5 F5")).toBeInTheDocument();
    expect(within(inScaleGroup).getByRole("button", { name: /G7/ })).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(onTargetChange).toHaveBeenLastCalledWith([67, 71, 74, 77]);
  });

  it("uses compact in-range example targets when a target range is supplied", () => {
    const { onTargetChange } = renderPanel({
      targetRange: MOBILE_PIANO_RANGE,
    });

    fireEvent.click(screen.getByRole("button", { name: /Dominant seventh/ }));
    const inScaleGroup = screen.getByRole("group", { name: "In this scale" });

    fireEvent.click(within(inScaleGroup).getByRole("button", { name: /G7/ }));

    expect(screen.getByText("Target notes: D3 F3 G3 B3")).toBeInTheDocument();
    expect(onTargetChange).toHaveBeenLastCalledWith([50, 53, 55, 59]);
  });

  it("clears the selected example and targets the active root when selecting another chord type", () => {
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Dominant seventh" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "In this scale" })).getByRole(
        "button",
        { name: /G7/ },
      ),
    );

    expect(screen.getByText("Target notes: G4 B4 D5 F5")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Major" }));

    expect(screen.getByRole("button", { name: "Major" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Major" })).toHaveAttribute(
      "data-selected",
      "true",
    );
    expect(screen.getByText("Target notes: C4 E4 G4")).toBeInTheDocument();
  });

  it("resets local scale overrides and clears the selected example when app key props change", () => {
    const onTargetChange = vi.fn();
    const { rerender } = render(
      <ChordConstructionPanel
        activePitchClasses={[]}
        appKeyMode="major"
        appKeyRoot="C"
        onTargetChange={onTargetChange}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Dominant seventh" }));
    fireEvent.click(
      within(screen.getByRole("group", { name: "In this scale" })).getByRole(
        "button",
        { name: /G7/ },
      ),
    );

    expect(screen.getByText("Target notes: G4 B4 D5 F5")).toBeInTheDocument();

    rerender(
      <ChordConstructionPanel
        activePitchClasses={[]}
        appKeyMode="minor"
        appKeyRoot="D"
        onTargetChange={onTargetChange}
      />,
    );

    expect(screen.getByText("D minor")).toBeInTheDocument();
    expect(screen.getByText("Target notes: D4 F#4 A4 C5")).toBeInTheDocument();
    expect(screen.queryByText("Target notes: G4 B4 D5 F5")).not.toBeInTheDocument();
  });

  it("shows empty in-scale example text when no examples are native to C major", () => {
    renderPanel();

    fireEvent.click(
      screen.getByRole("button", { name: "Dominant seven sharp nine" }),
    );

    expect(
      screen.getByText("No fully scale-native examples for this chord type."),
    ).toBeInTheDocument();
  });

  it("displays flat app key roots in the chord root control", () => {
    renderPanel({ appKeyRoot: "Bb" });

    expect(screen.getByLabelText("Chord root")).toHaveValue("Bb");
    expect(screen.getByText("Target notes: A#4 D5 F5")).toBeInTheDocument();
  });

  it("uses local root and mode overrides for the active-root target", () => {
    renderPanel();

    fireEvent.change(screen.getByLabelText("Chord root"), {
      target: { value: "D" },
    });
    fireEvent.change(screen.getByLabelText("Mode"), { target: { value: "minor" } });

    expect(screen.getByText("D minor")).toBeInTheDocument();
    expect(screen.getByText("Target notes: D4 F#4 A4")).toBeInTheDocument();
  });

  it("marks the default target as matched when active notes equal C major", () => {
    renderPanel({ activePitchClasses: ["G", "E", "C"] });

    expect(screen.getByText("Matched")).toBeInTheDocument();
  });
});
