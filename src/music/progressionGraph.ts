import type {
  KeyMode,
  ProgressionGenre,
  ProgressionGraph,
  ProgressionGraphNode,
} from "./types";

export const PROGRESSION_GENRES: ProgressionGenre[] = [
  "pop",
  "jazz",
  "blues",
  "classical",
  "gospel",
  "neo-soul",
];

function node(
  id: string,
  degree: number,
  quality: string,
  displayQuality: string,
  moves: ProgressionGraphNode["moves"],
  accidental = 0,
): ProgressionGraphNode {
  return {
    id,
    label: id,
    degree,
    quality,
    displayQuality,
    moves,
    ...(accidental === 0 ? {} : { accidental }),
  };
}

const commonMajorNodes: ProgressionGraphNode[] = [
  node("I", 1, "M", "", [
    {
      to: "vi",
      difficulty: "basic",
      functionLabel: "common",
      reason: "vi keeps the harmony familiar while changing color.",
    },
    {
      to: "IV",
      difficulty: "basic",
      functionLabel: "smooth",
      reason: "IV gives a clear lift away from home.",
    },
    {
      to: "V7",
      difficulty: "colorful",
      functionLabel: "tension",
      reason: "V7 creates pull back toward I.",
    },
  ]),
  node("vi", 6, "m", "m", [
    {
      to: "IV",
      difficulty: "basic",
      functionLabel: "smooth",
      reason: "vi to IV is a common pop handoff.",
    },
    {
      to: "ii",
      difficulty: "colorful",
      functionLabel: "smooth",
      reason: "ii sets up a stronger move toward V.",
    },
  ]),
  node("IV", 4, "M", "", [
    {
      to: "I",
      difficulty: "basic",
      functionLabel: "resolve",
      reason: "IV can settle gently back to I.",
    },
    {
      to: "V7",
      difficulty: "basic",
      functionLabel: "tension",
      reason: "IV to V7 builds a direct cadence.",
    },
  ]),
  node("V7", 5, "7", "7", [
    {
      to: "I",
      difficulty: "basic",
      functionLabel: "resolve",
      reason: "V7 strongly resolves to I.",
    },
    {
      to: "vi",
      difficulty: "colorful",
      functionLabel: "spicy",
      reason: "Moving to vi gives a deceptive cadence.",
    },
  ]),
  node("ii", 2, "m", "m", [
    {
      to: "V7",
      difficulty: "basic",
      functionLabel: "tension",
      reason: "ii to V7 is a classic setup for resolution.",
    },
  ]),
];

const commonMinorNodes: ProgressionGraphNode[] = [
  node("i", 1, "m", "m", [
    {
      to: "VI",
      difficulty: "basic",
      functionLabel: "smooth",
      reason: "VI opens the minor key with a broad color.",
    },
    {
      to: "iv",
      difficulty: "basic",
      functionLabel: "smooth",
      reason: "iv keeps the sound grounded in minor.",
    },
    {
      to: "V7",
      difficulty: "colorful",
      functionLabel: "tension",
      reason: "V7 adds harmonic-minor pull back to i.",
    },
  ]),
  node("iv", 4, "m", "m", [
    {
      to: "i",
      difficulty: "basic",
      functionLabel: "resolve",
      reason: "iv returns naturally to i.",
    },
    {
      to: "V7",
      difficulty: "colorful",
      functionLabel: "tension",
      reason: "iv to V7 creates a strong minor cadence.",
    },
  ]),
  node("VI", 6, "M", "", [
    {
      to: "III",
      difficulty: "basic",
      functionLabel: "smooth",
      reason: "VI to III is a familiar minor-key lift.",
    },
    {
      to: "VII",
      difficulty: "basic",
      functionLabel: "common",
      reason: "VII keeps the progression moving stepwise.",
    },
  ]),
  node("III", 3, "M", "", [
    {
      to: "VII",
      difficulty: "basic",
      functionLabel: "common",
      reason: "III to VII keeps a broad minor pop sound.",
    },
  ]),
  node("VII", 7, "M", "", [
    {
      to: "i",
      difficulty: "basic",
      functionLabel: "resolve",
      reason: "VII falls back into the minor tonic.",
    },
  ]),
  node("V7", 5, "7", "7", [
    {
      to: "i",
      difficulty: "basic",
      functionLabel: "resolve",
      reason: "V7 resolves strongly into minor i.",
    },
  ]),
];

function graph(
  genre: ProgressionGenre,
  mode: KeyMode,
  starterNodeIds: string[],
  nodes: ProgressionGraphNode[],
): ProgressionGraph {
  return { genre, mode, starterNodeIds, nodes };
}

function withMove(
  graphNode: ProgressionGraphNode,
  move: ProgressionGraphNode["moves"][number],
): ProgressionGraphNode {
  return { ...graphNode, moves: [...graphNode.moves, move] };
}

const graphs: Record<ProgressionGenre, Record<KeyMode, ProgressionGraph>> = {
  pop: {
    major: graph("pop", "major", ["I", "vi", "IV"], commonMajorNodes),
    minor: graph("pop", "minor", ["i", "VI", "VII"], commonMinorNodes),
  },
  jazz: {
    major: graph("jazz", "major", ["Imaj7", "ii7", "V7"], [
      node("Imaj7", 1, "maj7", "maj7", [
        {
          to: "vi7",
          difficulty: "colorful",
          functionLabel: "smooth",
          reason: "vi7 extends the key center with a soft color.",
        },
        {
          to: "ii7",
          difficulty: "basic",
          functionLabel: "common",
          reason: "ii7 begins the core ii-V-I motion.",
        },
      ]),
      node("ii7", 2, "m7", "m7", [
        {
          to: "V7",
          difficulty: "basic",
          functionLabel: "tension",
          reason: "ii7 usually points toward V7 in jazz.",
        },
        {
          to: "bII7",
          difficulty: "advanced",
          functionLabel: "spicy",
          reason: "bII7 is a tritone substitute leading back to I.",
        },
      ]),
      node("V7", 5, "7", "7", [
        {
          to: "Imaj7",
          difficulty: "basic",
          functionLabel: "resolve",
          reason: "V7 resolves to Imaj7.",
        },
        {
          to: "vi7",
          difficulty: "colorful",
          functionLabel: "spicy",
          reason: "V7 to vi7 delays the expected resolution.",
        },
      ]),
      node("vi7", 6, "m7", "m7", [
        {
          to: "ii7",
          difficulty: "basic",
          functionLabel: "common",
          reason: "vi7 cycles smoothly into ii7.",
        },
      ]),
      node(
        "bII7",
        2,
        "7",
        "7",
        [
          {
            to: "Imaj7",
            difficulty: "advanced",
            functionLabel: "resolve",
            reason: "bII7 slides down by half step into Imaj7.",
          },
        ],
        -1,
      ),
    ]),
    minor: graph("jazz", "minor", ["i7", "iim7b5", "V7alt"], [
      node("i7", 1, "m7", "m7", [
        {
          to: "iim7b5",
          difficulty: "colorful",
          functionLabel: "smooth",
          reason: "iim7b5 starts the minor ii-V-i sound.",
        },
        {
          to: "iv7",
          difficulty: "basic",
          functionLabel: "smooth",
          reason: "iv7 stays inside the minor color.",
        },
      ]),
      node("iim7b5", 2, "m7b5", "m7b5", [
        {
          to: "V7alt",
          difficulty: "advanced",
          functionLabel: "tension",
          reason: "V7alt gives the strongest jazz pull back to i.",
        },
      ]),
      node("V7alt", 5, "7", "7alt", [
        {
          to: "i7",
          difficulty: "advanced",
          functionLabel: "resolve",
          reason: "Altered dominant color resolves to minor i.",
        },
      ]),
      node("iv7", 4, "m7", "m7", [
        {
          to: "viio7",
          difficulty: "advanced",
          functionLabel: "tension",
          reason: "viio7 creates a tight leading-tone pull.",
        },
      ]),
      node(
        "viio7",
        7,
        "dim7",
        "dim7",
        [
          {
            to: "i7",
            difficulty: "advanced",
            functionLabel: "resolve",
            reason: "The diminished leading-tone chord resolves to i.",
          },
        ],
        1,
      ),
    ]),
  },
  blues: {
    major: graph("blues", "major", ["I7", "IV7", "V7"], [
      node("I7", 1, "7", "7", [
        {
          to: "IV7",
          difficulty: "basic",
          functionLabel: "common",
          reason: "I7 to IV7 is the center of the blues form.",
        },
        {
          to: "V7",
          difficulty: "basic",
          functionLabel: "tension",
          reason: "V7 turns the blues back toward I7.",
        },
      ]),
      node("IV7", 4, "7", "7", [
        {
          to: "I7",
          difficulty: "basic",
          functionLabel: "resolve",
          reason: "IV7 returns to the home dominant sound.",
        },
        {
          to: "#IVdim7",
          difficulty: "advanced",
          functionLabel: "spicy",
          reason: "#IVdim7 is a passing chord into I or V.",
        },
      ]),
      node("V7", 5, "7", "7", [
        {
          to: "IV7",
          difficulty: "basic",
          functionLabel: "common",
          reason: "V7 to IV7 is the classic blues turnaround descent.",
        },
        {
          to: "I7",
          difficulty: "basic",
          functionLabel: "resolve",
          reason: "V7 can also resolve straight home.",
        },
      ]),
      node(
        "#IVdim7",
        4,
        "dim7",
        "dim7",
        [
          {
            to: "I7",
            difficulty: "advanced",
            functionLabel: "resolve",
            reason: "The diminished passing chord slides back to I7.",
          },
        ],
        1,
      ),
    ]),
    minor: graph("blues", "minor", ["i7", "iv7", "V7"], [
      node("i7", 1, "m7", "m7", [
        {
          to: "iv7",
          difficulty: "basic",
          functionLabel: "common",
          reason: "i7 to iv7 gives the minor blues movement.",
        },
        {
          to: "V7",
          difficulty: "colorful",
          functionLabel: "tension",
          reason: "V7 turns the minor blues back home.",
        },
      ]),
      node("iv7", 4, "m7", "m7", [
        {
          to: "i7",
          difficulty: "basic",
          functionLabel: "resolve",
          reason: "iv7 settles back into the tonic minor sound.",
        },
      ]),
      node("V7", 5, "7", "7", [
        {
          to: "i7",
          difficulty: "basic",
          functionLabel: "resolve",
          reason: "V7 pulls back into i7.",
        },
      ]),
    ]),
  },
  classical: {
    major: graph("classical", "major", ["I", "IV", "V7"], commonMajorNodes),
    minor: graph("classical", "minor", ["i", "iv", "V7"], [
      ...commonMinorNodes.map((graphNode) =>
        graphNode.id === "iv"
          ? withMove(graphNode, {
              to: "viio7",
              difficulty: "advanced",
              functionLabel: "tension",
              reason: "iv can intensify into the leading-tone chord.",
            })
          : graphNode,
      ),
      node(
        "viio7",
        7,
        "dim7",
        "dim7",
        [
          {
            to: "i",
            difficulty: "advanced",
            functionLabel: "resolve",
            reason: "viio7 is a leading-tone chord that resolves to i.",
          },
        ],
        1,
      ),
    ]),
  },
  gospel: {
    major: graph("gospel", "major", ["I", "IV", "ii7"], [
      ...commonMajorNodes.map((graphNode) =>
        graphNode.id === "IV"
          ? withMove(graphNode, {
              to: "V/V",
              difficulty: "advanced",
              functionLabel: "tension",
              reason: "IV can lift into a secondary dominant for V7.",
            })
          : graphNode,
      ),
      node("ii7", 2, "m7", "m7", [
        {
          to: "V7sus4",
          difficulty: "colorful",
          functionLabel: "tension",
          reason: "V7sus4 gives a gospel-style suspended pull.",
        },
      ]),
      node("V7sus4", 5, "7sus4", "7sus4", [
        {
          to: "I",
          difficulty: "colorful",
          functionLabel: "resolve",
          reason: "The suspension releases into I.",
        },
      ]),
      node("V/V", 2, "7", "7", [
        {
          to: "V7",
          difficulty: "advanced",
          functionLabel: "tension",
          reason: "Secondary dominant points toward V7.",
        },
      ]),
    ]),
    minor: graph("gospel", "minor", ["i", "iv", "V7"], [
      ...commonMinorNodes.map((graphNode) =>
        graphNode.id === "iv"
          ? withMove(graphNode, {
              to: "ivm7",
              difficulty: "colorful",
              functionLabel: "smooth",
              reason: "iv can deepen into ivm7 before the suspended V.",
            })
          : graphNode,
      ),
      node("ivm7", 4, "m7", "m7", [
        {
          to: "V7sus4",
          difficulty: "colorful",
          functionLabel: "tension",
          reason: "Suspended dominant color prepares the return to i.",
        },
      ]),
      node("V7sus4", 5, "7sus4", "7sus4", [
        {
          to: "i",
          difficulty: "colorful",
          functionLabel: "resolve",
          reason: "The suspended dominant resolves to minor i.",
        },
      ]),
    ]),
  },
  "neo-soul": {
    major: graph("neo-soul", "major", ["Imaj7", "IVmaj7", "ii7"], [
      node("Imaj7", 1, "maj7", "maj7", [
        {
          to: "IVmaj7",
          difficulty: "colorful",
          functionLabel: "smooth",
          reason: "IVmaj7 gives a warm lift from Imaj7.",
        },
        {
          to: "vi7",
          difficulty: "colorful",
          functionLabel: "common",
          reason: "vi7 keeps the sound mellow and connected.",
        },
        {
          to: "bVII13sus",
          difficulty: "advanced",
          functionLabel: "spicy",
          reason: "bVII13sus borrows a rich dominant color.",
        },
      ]),
      node("IVmaj7", 4, "maj7", "maj7", [
        {
          to: "ii7",
          difficulty: "colorful",
          functionLabel: "smooth",
          reason: "IVmaj7 to ii7 moves by shared tones.",
        },
        {
          to: "Imaj7",
          difficulty: "basic",
          functionLabel: "resolve",
          reason: "Returning to Imaj7 settles the color.",
        },
      ]),
      node("ii7", 2, "m7", "m7", [
        {
          to: "V7sus4",
          difficulty: "colorful",
          functionLabel: "tension",
          reason:
            "V7sus4 adds suspended movement without sounding too final.",
        },
      ]),
      node("vi7", 6, "m7", "m7", [
        {
          to: "IVmaj7",
          difficulty: "basic",
          functionLabel: "smooth",
          reason: "vi7 flows naturally into IVmaj7.",
        },
      ]),
      node("V7sus4", 5, "7sus4", "7sus4", [
        {
          to: "Imaj7",
          difficulty: "colorful",
          functionLabel: "resolve",
          reason: "The suspended dominant resolves into Imaj7.",
        },
      ]),
      node(
        "bVII13sus",
        7,
        "13sus4",
        "13sus",
        [
          {
            to: "Imaj7",
            difficulty: "advanced",
            functionLabel: "resolve",
            reason: "Borrowed bVII color relaxes back into Imaj7.",
          },
        ],
        -1,
      ),
    ]),
    minor: graph("neo-soul", "minor", ["i9", "iv9", "bVImaj7"], [
      node("i9", 1, "m9", "m9", [
        {
          to: "iv9",
          difficulty: "colorful",
          functionLabel: "smooth",
          reason: "iv9 deepens the minor color.",
        },
        {
          to: "bVImaj7",
          difficulty: "colorful",
          functionLabel: "common",
          reason: "bVImaj7 gives a lush modal shift.",
        },
      ]),
      node("iv9", 4, "m9", "m9", [
        {
          to: "i9",
          difficulty: "basic",
          functionLabel: "resolve",
          reason: "iv9 returns smoothly to i9.",
        },
        {
          to: "V7sus4",
          difficulty: "advanced",
          functionLabel: "tension",
          reason: "Suspended dominant color prepares the return.",
        },
      ]),
      node("bVImaj7", 6, "maj7", "maj7", [
        {
          to: "V7sus4",
          difficulty: "advanced",
          functionLabel: "tension",
          reason: "bVImaj7 can slide into a suspended dominant.",
        },
      ]),
      node("V7sus4", 5, "7sus4", "7sus4", [
        {
          to: "i9",
          difficulty: "colorful",
          functionLabel: "resolve",
          reason: "V7sus4 releases back to the minor tonic color.",
        },
      ]),
    ]),
  },
};

export function getProgressionGraph(
  genre: ProgressionGenre,
  mode: KeyMode,
): ProgressionGraph {
  return graphs[genre][mode];
}

export function getProgressionNode(
  genre: ProgressionGenre,
  mode: KeyMode,
  nodeId: string,
): ProgressionGraphNode {
  const node = getProgressionGraph(genre, mode).nodes.find(
    (candidate) => candidate.id === nodeId,
  );

  if (!node) {
    throw new Error(`Unknown progression node ${nodeId} for ${genre} ${mode}.`);
  }

  return node;
}
