import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChordReadout } from "../ChordReadout";

describe("ChordReadout", () => {
  it("shows no chord empty state", () => {
    render(
      <ChordReadout
        detection={{
          primary: null,
          alternatives: [],
          candidates: [],
          pitchClasses: [],
        }}
        displayNotes={[]}
      />,
    );

    expect(screen.getByText("No chord")).toBeInTheDocument();
    expect(screen.getByText("Press three or more notes")).toBeInTheDocument();
  });

  it("shows primary chord, alternate names, and pressed notes", () => {
    render(
      <ChordReadout
        detection={{
          primary: "C6",
          alternatives: ["Am7/C"],
          candidates: ["C6", "Am7/C"],
          pitchClasses: ["A", "C", "E", "G"],
        }}
        displayNotes={["C4", "E4", "G4", "A4"]}
      />,
    );

    expect(screen.getByRole("heading", { name: "C6" })).toBeInTheDocument();
    expect(screen.getByText("Am7/C")).toBeInTheDocument();
    expect(screen.getByText("C4 E4 G4 A4")).toBeInTheDocument();
    expect(screen.getByText("Pitch classes: A C E G")).toBeInTheDocument();
  });
});
