import { describe, expect, it } from "vitest";
import {
  PROGRESSION_GENRES,
  getProgressionGraph,
  getProgressionNode,
} from "../progressionGraph";

describe("progressionGraph", () => {
  it("defines the v1 genre set", () => {
    expect(PROGRESSION_GENRES).toEqual([
      "pop",
      "jazz",
      "blues",
      "classical",
      "gospel",
      "neo-soul",
    ]);
  });

  it("provides major and minor graphs for every genre", () => {
    PROGRESSION_GENRES.forEach((genre) => {
      expect(
        getProgressionGraph(genre, "major").starterNodeIds.length,
      ).toBeGreaterThan(0);
      expect(
        getProgressionGraph(genre, "minor").starterNodeIds.length,
      ).toBeGreaterThan(0);
    });
  });

  it("returns directed suggestions for a node", () => {
    const node = getProgressionNode("neo-soul", "major", "Imaj7");

    expect(node.label).toBe("Imaj7");
    expect(node.moves.map((move) => move.to)).toContain("IVmaj7");
    expect(node.moves.some((move) => move.difficulty === "colorful")).toBe(
      true,
    );
  });

  it("includes richer chord qualities in curated graph data", () => {
    const jazzMinor = getProgressionGraph("jazz", "minor");
    const nodeIds = jazzMinor.nodes.map((node) => node.id);

    expect(nodeIds).toContain("iim7b5");
    expect(nodeIds).toContain("V7alt");
    expect(nodeIds).toContain("viio7");
  });
});
