import {
  buildCompassNodeView,
  buildTargetVoicingForNode,
  doesPitchClassSetMatchTarget,
} from "./progressionCompass";
import { PROGRESSION_GENRES, getProgressionNode } from "./progressionGraph";
import type {
  CuratedProgression,
  KeyMode,
  ProgressionGenre,
  ResolvedProgression,
  ResolvedProgressionStep,
} from "./types";

const KEY_MODES: KeyMode[] = ["major", "minor"];

const curatedProgressions: Record<
  ProgressionGenre,
  Record<KeyMode, CuratedProgression[]>
> = {
  pop: {
    major: [
      {
        id: "pop-axis",
        name: "Axis Progression",
        nodeIds: ["I", "V7", "vi", "IV"],
        description: "A familiar four-chord loop for modern pop practice.",
      },
      {
        id: "pop-lift",
        name: "Lift Progression",
        nodeIds: ["I", "IV", "V7", "I"],
        description: "A direct tonic, lift, tension, and resolve pattern.",
      },
      {
        id: "pop-soft-loop",
        name: "Soft Loop",
        nodeIds: ["vi", "IV", "I", "V7"],
        description: "Starts with minor color before resolving into the key.",
      },
    ],
    minor: [
      {
        id: "pop-minor-loop",
        name: "Minor Loop",
        nodeIds: ["i", "VI", "III", "VII"],
        description: "A broad minor-key loop with familiar pop motion.",
      },
      {
        id: "pop-minor-cadence",
        name: "Minor Cadence",
        nodeIds: ["i", "iv", "V7", "i"],
        description: "A compact minor cadence with dominant pull.",
      },
    ],
  },
  jazz: {
    major: [
      {
        id: "jazz-two-five-one",
        name: "Two-Five-One",
        nodeIds: ["ii7", "V7", "Imaj7"],
        description: "The core jazz cadence for major-key resolution.",
      },
      {
        id: "jazz-rhythm-turnaround",
        name: "Rhythm Turnaround",
        nodeIds: ["Imaj7", "vi7", "ii7", "V7"],
        description: "A compact turnaround that cycles back to tonic.",
      },
      {
        id: "jazz-tritone-resolution",
        name: "Tritone Resolution",
        nodeIds: ["ii7", "bII7", "Imaj7"],
        description: "Uses the tritone substitute for chromatic dominant pull.",
      },
    ],
    minor: [
      {
        id: "jazz-minor-two-five-one",
        name: "Minor Two-Five-One",
        nodeIds: ["iim7b5", "V7alt", "i7"],
        description: "The essential minor jazz cadence.",
      },
      {
        id: "jazz-leading-tone",
        name: "Leading-Tone Resolution",
        nodeIds: ["i7", "iv7", "viio7", "i7"],
        description: "A darker minor motion through diminished tension.",
      },
    ],
  },
  blues: {
    major: [
      {
        id: "blues-basic-turnaround",
        name: "Basic Turnaround",
        nodeIds: ["I7", "IV7", "I7", "V7"],
        description: "A compact dominant blues path back to the top.",
      },
      {
        id: "blues-diminished-passing",
        name: "Diminished Passing",
        nodeIds: ["I7", "IV7", "#IVdim7", "I7"],
        description: "Adds the classic diminished passing color.",
      },
    ],
    minor: [
      {
        id: "blues-minor-turnaround",
        name: "Minor Turnaround",
        nodeIds: ["i7", "iv7", "i7", "V7"],
        description: "The core minor blues tonic, subdominant, and dominant.",
      },
    ],
  },
  classical: {
    major: [
      {
        id: "classical-authentic-cadence",
        name: "Authentic Cadence",
        nodeIds: ["I", "IV", "V7", "I"],
        description: "A direct phrase shape ending with dominant resolution.",
      },
      {
        id: "classical-deceptive-cadence",
        name: "Deceptive Cadence",
        nodeIds: ["I", "ii", "V7", "vi"],
        description: "Sets up a dominant and resolves deceptively to vi.",
      },
    ],
    minor: [
      {
        id: "classical-minor-cadence",
        name: "Minor Cadence",
        nodeIds: ["i", "iv", "V7", "i"],
        description: "A minor-key cadence with harmonic-minor dominant pull.",
      },
      {
        id: "classical-leading-tone",
        name: "Leading-Tone Cadence",
        nodeIds: ["i", "iv", "viio7", "i"],
        description: "Uses the leading-tone diminished chord to resolve home.",
      },
    ],
  },
  gospel: {
    major: [
      {
        id: "gospel-suspended-cadence",
        name: "Suspended Cadence",
        nodeIds: ["I", "ii7", "V7sus4", "I"],
        description: "A suspended dominant release with gospel color.",
      },
      {
        id: "gospel-secondary-lift",
        name: "Secondary Lift",
        nodeIds: ["I", "IV", "V/V", "V7"],
        description: "Lifts through a secondary dominant before the cadence.",
      },
    ],
    minor: [
      {
        id: "gospel-minor-suspension",
        name: "Minor Suspension",
        nodeIds: ["i", "iv", "ivm7", "V7sus4", "i"],
        description: "Deepens the minor subdominant before suspended release.",
      },
      {
        id: "gospel-minor-cadence",
        name: "Minor Cadence",
        nodeIds: ["i", "iv", "V7", "i"],
        description: "A direct minor gospel cadence with dominant pull.",
      },
    ],
  },
  "neo-soul": {
    major: [
      {
        id: "neo-soul-major-loop",
        name: "Major Color Loop",
        nodeIds: ["Imaj7", "vi7", "IVmaj7", "ii7"],
        description: "A mellow loop through extended major-key colors.",
      },
      {
        id: "neo-soul-borrowed-resolution",
        name: "Borrowed Resolution",
        nodeIds: ["Imaj7", "bVII13sus", "Imaj7"],
        description: "Uses borrowed suspended dominant color around tonic.",
      },
    ],
    minor: [
      {
        id: "neo-soul-minor-loop",
        name: "Minor Color Loop",
        nodeIds: ["i9", "bVImaj7", "V7sus4", "i9"],
        description: "A lush minor-key loop with suspended dominant release.",
      },
      {
        id: "neo-soul-minor-plagal",
        name: "Minor Plagal Color",
        nodeIds: ["i9", "iv9", "i9"],
        description: "Moves through extended minor plagal color.",
      },
    ],
  },
};

export function getCuratedProgressions(
  genre: ProgressionGenre,
  mode: KeyMode,
): CuratedProgression[] {
  return curatedProgressions[genre][mode];
}

export function getFirstProgressionId(
  genre: ProgressionGenre,
  mode: KeyMode,
): string | null {
  return getCuratedProgressions(genre, mode)[0]?.id ?? null;
}

export function resolveProgression(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  progression: CuratedProgression,
): ResolvedProgression {
  const steps = progression.nodeIds.map<ResolvedProgressionStep>((nodeId) => {
    const view = buildCompassNodeView(genre, mode, keyRoot, nodeId);

    return {
      ...view,
      target: buildTargetVoicingForNode(genre, mode, keyRoot, nodeId),
    };
  });

  return {
    id: progression.id,
    name: progression.name,
    displaySequence: steps.map((step) => step.displayName).join(" - "),
    steps,
    ...(progression.description ? { description: progression.description } : {}),
  };
}

export function getResolvedProgressions(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
): ResolvedProgression[] {
  return getCuratedProgressions(genre, mode).map((progression) =>
    resolveProgression(genre, mode, keyRoot, progression),
  );
}

export function getResolvedProgression(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  progressionId: string | null,
): ResolvedProgression | null {
  if (progressionId === null) {
    return null;
  }

  const progression =
    getCuratedProgressions(genre, mode).find(
      (candidate) => candidate.id === progressionId,
    ) ?? null;

  if (!progression) {
    return null;
  }

  return resolveProgression(genre, mode, keyRoot, progression);
}

export function doesProgressionStepMatchPitchClasses(
  step: ResolvedProgressionStep,
  pitchClasses: string[],
): boolean {
  return doesPitchClassSetMatchTarget(pitchClasses, step.target.pitchClasses);
}

export function validateCuratedProgressions(): string[] {
  const errors: string[] = [];

  PROGRESSION_GENRES.forEach((genre) => {
    KEY_MODES.forEach((mode) => {
      const progressions = getCuratedProgressions(genre, mode);

      if (progressions.length === 0) {
        errors.push(`No curated progressions for ${genre} ${mode}.`);
      }

      progressions.forEach((progression) => {
        progression.nodeIds.forEach((nodeId) => {
          try {
            getProgressionNode(genre, mode, nodeId);
          } catch {
            errors.push(
              `Unknown node ${nodeId} in progression ${progression.id} for ${genre} ${mode}.`,
            );
          }
        });
      });
    });
  });

  return errors;
}
