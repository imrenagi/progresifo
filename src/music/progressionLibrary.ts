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

type ProgressionLibraryData = Partial<
  Record<
    ProgressionGenre,
    Partial<Record<KeyMode, readonly CuratedProgression[]>>
  >
>;

const curatedProgressions: Record<
  ProgressionGenre,
  Record<KeyMode, readonly CuratedProgression[]>
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
      {
        id: "pop-circle-lift",
        name: "Circle Lift",
        nodeIds: ["I", "vi", "ii", "V7"],
        description: "Uses the familiar I-vi-ii-V circle motion.",
      },
      {
        id: "pop-prechorus-rise",
        name: "Prechorus Rise",
        nodeIds: ["vi", "ii", "V7", "I"],
        description: "Builds from minor color into a clear tonic arrival.",
      },
      {
        id: "pop-deceptive-loop",
        name: "Deceptive Loop",
        nodeIds: ["IV", "V7", "vi", "IV"],
        description: "Turns dominant tension into deceptive minor color.",
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
      {
        id: "pop-minor-step",
        name: "Minor Step Loop",
        nodeIds: ["i", "VI", "VII", "i"],
        description: "Moves through the broad VI and VII colors back to tonic.",
      },
      {
        id: "pop-minor-lift",
        name: "Minor Lift",
        nodeIds: ["VI", "III", "VII", "i"],
        description: "Starts away from tonic and falls back into minor home.",
      },
      {
        id: "pop-minor-dominant",
        name: "Dominant Return",
        nodeIds: ["VI", "VII", "i", "V7"],
        description: "Uses VII and V7 to keep the loop turning.",
      },
      {
        id: "pop-minor-plagal",
        name: "Minor Plagal",
        nodeIds: ["i", "iv", "i", "VI"],
        description: "Alternates tonic and iv before opening to VI.",
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
      {
        id: "jazz-one-six-two-five",
        name: "One-Six-Two-Five",
        nodeIds: ["Imaj7", "vi7", "ii7", "V7", "Imaj7"],
        description: "A complete turnaround returning to the tonic.",
      },
      {
        id: "jazz-delayed-resolution",
        name: "Delayed Resolution",
        nodeIds: ["V7", "vi7", "ii7", "V7"],
        description: "Delays tonic by moving through vi7 and back to ii-V.",
      },
      {
        id: "jazz-chromatic-cadence",
        name: "Chromatic Cadence",
        nodeIds: ["Imaj7", "ii7", "bII7", "Imaj7"],
        description: "Adds chromatic dominant color before resolving home.",
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
      {
        id: "jazz-minor-color-cycle",
        name: "Minor Color Cycle",
        nodeIds: ["i7", "iv7", "iim7b5", "V7alt"],
        description: "Moves through iv color into the minor ii-V setup.",
      },
      {
        id: "jazz-minor-turnaround",
        name: "Minor Turnaround",
        nodeIds: ["i7", "iim7b5", "V7alt", "i7"],
        description: "A complete minor turnaround back to i7.",
      },
      {
        id: "jazz-diminished-setup",
        name: "Diminished Setup",
        nodeIds: ["iv7", "viio7", "i7", "iim7b5"],
        description: "Uses leading-tone diminished color to restart ii-V motion.",
      },
      {
        id: "jazz-altered-loop",
        name: "Altered Loop",
        nodeIds: ["V7alt", "i7", "iv7", "viio7"],
        description: "Starts on altered dominant and cycles through minor color.",
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
      {
        id: "blues-quick-change",
        name: "Quick Change",
        nodeIds: ["I7", "IV7", "I7", "I7"],
        description: "A compact quick-change opening for blues practice.",
      },
      {
        id: "blues-turnback",
        name: "Turnback",
        nodeIds: ["V7", "IV7", "I7", "V7"],
        description: "The classic V-IV-I turnback into another chorus.",
      },
      {
        id: "blues-home-dominant",
        name: "Home Dominant",
        nodeIds: ["I7", "V7", "IV7", "I7"],
        description: "Moves from tonic to dominant and back through IV.",
      },
      {
        id: "blues-dim-return",
        name: "Diminished Return",
        nodeIds: ["IV7", "#IVdim7", "I7", "V7"],
        description: "Uses diminished passing color before the turnaround.",
      },
    ],
    minor: [
      {
        id: "blues-minor-turnaround",
        name: "Minor Turnaround",
        nodeIds: ["i7", "iv7", "i7", "V7"],
        description: "The core minor blues tonic, subdominant, and dominant.",
      },
      {
        id: "blues-minor-home",
        name: "Minor Home",
        nodeIds: ["i7", "iv7", "i7", "i7"],
        description: "Practices the core i7 to iv7 minor blues color.",
      },
      {
        id: "blues-minor-dominant",
        name: "Minor Dominant",
        nodeIds: ["i7", "V7", "i7", "iv7"],
        description: "Adds dominant bite before returning to the iv color.",
      },
      {
        id: "blues-minor-return",
        name: "Minor Return",
        nodeIds: ["V7", "i7", "iv7", "i7"],
        description: "Starts from dominant tension and settles back home.",
      },
      {
        id: "blues-minor-plagal",
        name: "Minor Plagal",
        nodeIds: ["iv7", "i7", "V7", "i7"],
        description: "Moves through iv7 and V7 before resolving to i7.",
      },
      {
        id: "blues-minor-vamp",
        name: "Minor Vamp",
        nodeIds: ["i7", "V7", "iv7", "i7"],
        description: "A compact minor vamp using both dominant and iv color.",
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
      {
        id: "classical-circle",
        name: "Circle Motion",
        nodeIds: ["I", "vi", "ii", "V7", "I"],
        description: "A compact circle-of-fifths phrase shape.",
      },
      {
        id: "classical-plagal",
        name: "Plagal Cadence",
        nodeIds: ["I", "IV", "I", "V7"],
        description: "Practices tonic-subdominant motion before a dominant.",
      },
      {
        id: "classical-predominant",
        name: "Predominant Cadence",
        nodeIds: ["ii", "V7", "I", "IV"],
        description: "Highlights the ii-V-I cadence and its IV continuation.",
      },
      {
        id: "classical-deceptive-return",
        name: "Deceptive Return",
        nodeIds: ["V7", "vi", "ii", "V7"],
        description: "Uses deceptive motion to restart dominant preparation.",
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
      {
        id: "classical-minor-relative",
        name: "Relative Major Loop",
        nodeIds: ["i", "VI", "III", "VII"],
        description: "Moves through relative-major colors inside minor.",
      },
      {
        id: "classical-minor-step",
        name: "Minor Step Cadence",
        nodeIds: ["VI", "VII", "i", "iv"],
        description: "Steps through VI and VII before returning to iv.",
      },
      {
        id: "classical-minor-dominant",
        name: "Minor Dominant",
        nodeIds: ["iv", "V7", "i", "VI"],
        description: "Uses iv to V7 dominant pull before opening to VI.",
      },
      {
        id: "classical-minor-deceptive",
        name: "Minor Deceptive",
        nodeIds: ["V7", "i", "VI", "VII"],
        description: "Resolves dominant tension and continues into VI and VII.",
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
      {
        id: "gospel-one-six-two",
        name: "One-Six-Two",
        nodeIds: ["I", "vi", "ii7", "V7sus4"],
        description: "A gospel-flavored I-vi-ii setup into suspended dominant.",
      },
      {
        id: "gospel-suspension-release",
        name: "Suspension Release",
        nodeIds: ["ii7", "V7sus4", "I", "IV"],
        description: "Resolves suspended dominant and lifts into IV.",
      },
      {
        id: "gospel-secondary-cadence",
        name: "Secondary Cadence",
        nodeIds: ["IV", "V/V", "V7", "I"],
        description: "Uses a secondary dominant to intensify the cadence.",
      },
      {
        id: "gospel-deceptive-color",
        name: "Deceptive Color",
        nodeIds: ["V7", "vi", "ii7", "V7sus4"],
        description: "Delays resolution through vi before suspended V.",
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
      {
        id: "gospel-minor-relative",
        name: "Minor Relative",
        nodeIds: ["i", "VI", "III", "VII"],
        description: "Uses broad relative-major motion inside minor.",
      },
      {
        id: "gospel-minor-suspended-return",
        name: "Suspended Return",
        nodeIds: ["ivm7", "V7sus4", "i", "VI"],
        description: "Resolves suspended dominant into i before opening to VI.",
      },
      {
        id: "gospel-minor-step",
        name: "Minor Step",
        nodeIds: ["VI", "VII", "i", "iv"],
        description: "Steps through VI and VII into tonic and iv.",
      },
      {
        id: "gospel-minor-turn",
        name: "Minor Turn",
        nodeIds: ["V7", "i", "iv", "ivm7"],
        description: "Turns dominant resolution into deeper iv color.",
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
      {
        id: "neo-soul-plagal-color",
        name: "Plagal Color",
        nodeIds: ["Imaj7", "IVmaj7", "Imaj7", "vi7"],
        description: "Alternates warm plagal color with mellow vi7.",
      },
      {
        id: "neo-soul-suspended-cadence",
        name: "Suspended Cadence",
        nodeIds: ["IVmaj7", "ii7", "V7sus4", "Imaj7"],
        description: "Uses ii and suspended V before returning home.",
      },
      {
        id: "neo-soul-borrowed-loop",
        name: "Borrowed Loop",
        nodeIds: ["bVII13sus", "Imaj7", "vi7", "IVmaj7"],
        description: "Starts with borrowed dominant color and relaxes inward.",
      },
      {
        id: "neo-soul-two-five-color",
        name: "Two-Five Color",
        nodeIds: ["ii7", "V7sus4", "Imaj7", "IVmaj7"],
        description: "Softens ii-V-I motion with suspended dominant color.",
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
      {
        id: "neo-soul-minor-suspended",
        name: "Minor Suspended",
        nodeIds: ["i9", "iv9", "V7sus4", "i9"],
        description: "Adds suspended dominant release to the minor plagal color.",
      },
      {
        id: "neo-soul-minor-modal",
        name: "Minor Modal",
        nodeIds: ["i9", "bVImaj7", "iv9", "i9"],
        description: "Moves between tonic, bVI color, and iv9.",
      },
      {
        id: "neo-soul-minor-slide",
        name: "Minor Slide",
        nodeIds: ["bVImaj7", "V7sus4", "i9", "iv9"],
        description: "Slides from bVI into suspended dominant and tonic.",
      },
      {
        id: "neo-soul-minor-return",
        name: "Minor Return",
        nodeIds: ["iv9", "V7sus4", "i9", "bVImaj7"],
        description: "Uses suspended dominant to return before shifting to bVI.",
      },
    ],
  },
};

function cloneCuratedProgression(
  progression: CuratedProgression,
): CuratedProgression {
  return {
    id: progression.id,
    name: progression.name,
    nodeIds: [...progression.nodeIds],
    ...(progression.description ? { description: progression.description } : {}),
  };
}

export function getCuratedProgressions(
  genre: ProgressionGenre,
  mode: KeyMode,
): CuratedProgression[] {
  return curatedProgressions[genre][mode].map(cloneCuratedProgression);
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
  progressionId: string | null | undefined,
): ResolvedProgression | null {
  if (progressionId == null) {
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
  return validateProgressionLibrary(curatedProgressions);
}

export function validateProgressionLibrary(
  progressionsByGenre: ProgressionLibraryData,
): string[] {
  const errors: string[] = [];

  PROGRESSION_GENRES.forEach((genre) => {
    KEY_MODES.forEach((mode) => {
      const progressions = progressionsByGenre[genre]?.[mode] ?? [];

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
