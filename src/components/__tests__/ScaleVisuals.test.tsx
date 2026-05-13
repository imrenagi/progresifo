import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { buildScaleTarget, getScaleTypeById } from "../../music/scales";
import { MiniPianoMap } from "../MiniPianoMap";
import { ScaleStaff } from "../ScaleStaff";

describe("scale visuals", () => {
  it("renders a mini piano with shorter black keys layered over white keys", () => {
    render(
      <MiniPianoMap
        label="Mini piano map for test scale"
        pitchClasses={["C", "D#", "F#"]}
      />,
    );

    const map = screen.getByLabelText("Mini piano map for test scale");
    const whiteLayer = map.querySelector(".mini-piano-map__white-keys");
    const blackLayer = map.querySelector(".mini-piano-map__black-keys");

    expect(whiteLayer?.querySelectorAll(".mini-piano-map__key--white")).toHaveLength(7);
    expect(blackLayer?.querySelectorAll(".mini-piano-map__key--black")).toHaveLength(5);
    expect(blackLayer?.querySelector('[aria-label="D#4"]')).toHaveAttribute(
      "data-highlighted",
      "true",
    );
  });

  it("renders selected scale notes with a VexFlow treble clef staff", async () => {
    const target = buildScaleTarget("C", getScaleTypeById("major"));
    const { container } = render(
      <ScaleStaff label="Staff notation for C major" target={target} />,
    );

    expect(
      screen.getByLabelText("Treble clef staff notation for C major"),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(container.querySelector(".scale-staff__engraving svg")).toBeTruthy();
    });
    expect(container.querySelector(".vf-clef")).toBeTruthy();
  });
});
