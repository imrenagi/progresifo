import { describe, expect, it } from "vitest";
import {
  PROGRESSION_GENRES,
  getProgressionGraph,
  getProgressionNode,
} from "../progressionGraph";
import type { KeyMode } from "../types";

const KEY_MODES: KeyMode[] = ["major", "minor"];

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

  it("defines internally consistent and reachable graph data", () => {
    PROGRESSION_GENRES.forEach((genre) => {
      KEY_MODES.forEach((mode) => {
        const graph = getProgressionGraph(genre, mode);
        const nodeIds = graph.nodes.map((node) => node.id);
        const nodeIdSet = new Set(nodeIds);

        expect(nodeIdSet.size).toBe(nodeIds.length);

        graph.starterNodeIds.forEach((starterNodeId) => {
          expect(nodeIdSet.has(starterNodeId)).toBe(true);
        });

        graph.nodes.forEach((node) => {
          node.moves.forEach((move) => {
            expect(nodeIdSet.has(move.to)).toBe(true);
          });
        });

        const reachableNodeIds = new Set<string>();
        const pendingNodeIds = [...graph.starterNodeIds];

        while (pendingNodeIds.length > 0) {
          const nodeId = pendingNodeIds.pop();

          if (!nodeId || reachableNodeIds.has(nodeId)) {
            continue;
          }

          reachableNodeIds.add(nodeId);

          const node = graph.nodes.find((candidate) => candidate.id === nodeId);
          node?.moves.forEach((move) => {
            pendingNodeIds.push(move.to);
          });
        }

        const unreachableNodeIds = nodeIds.filter(
          (nodeId) => !reachableNodeIds.has(nodeId),
        );

        expect(unreachableNodeIds).toEqual([]);
      });
    });
  });

  it("keeps neo-soul minor bVImaj7 on the natural minor sixth degree", () => {
    const node = getProgressionNode("neo-soul", "minor", "bVImaj7");

    expect(node.degree).toBe(6);
    expect(node).not.toHaveProperty("accidental");
  });
});
