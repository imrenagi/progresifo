import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import App from "../../App";

describe("App", () => {
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
});
