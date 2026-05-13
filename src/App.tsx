import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useToneSynth } from "./audio/useToneSynth";
import { ChordConstructionPanel } from "./components/ChordConstructionPanel";
import { ChordReadout } from "./components/ChordReadout";
import { OnboardingGuide } from "./components/OnboardingGuide";
import { PianoKeyboard } from "./components/PianoKeyboard";
import { ProgressionCompass } from "./components/ProgressionCompass";
import { ProgressionPracticeRail } from "./components/ProgressionPracticeRail";
import { ProgressionTrail } from "./components/ProgressionTrail";
import { ScaleLearningPanel } from "./components/ScaleLearningPanel";
import { StatusBar } from "./components/StatusBar";
import { WorkspaceTabs } from "./components/WorkspaceTabs";
import { useMidiInput } from "./midi/useMidiInput";
import type { MidiNoteEvent } from "./midi/useMidiInput";
import {
  addActiveNote,
  getDisplayNotes,
  getUniqueMidiNumbers,
  removeAllNotesForSource,
  removeActiveNote,
} from "./music/activeNotes";
import { detectChord } from "./music/chords";
import {
  FULL_PIANO_RANGE,
  MOBILE_PIANO_RANGE,
} from "./music/notes";
import {
  getProgressionGraph,
  PROGRESSION_GENRES,
} from "./music/progressionGraph";
import {
  buildCompassNodeView,
  buildProgressionSuggestions,
  buildTargetVoicingForNode,
  doesPitchClassSetMatchTarget,
  findMatchingSuggestion,
  getStarterSuggestions,
} from "./music/progressionCompass";
import { addChordToProgression, type ProgressionEntry } from "./music/progression";
import {
  doesProgressionStepMatchPitchClasses,
  getFirstProgressionId,
  getResolvedProgression,
  getResolvedProgressions,
} from "./music/progressionLibrary";
import type {
  ActiveNote,
  ActiveNoteSource,
  CompassNodeView,
  KeyMode,
  PianoInteractionMode,
  PianoRange,
  ProgressionDisplayMode,
  ProgressionGenre,
  ProgressionSuggestion,
  WorkspaceMode,
} from "./music/types";

const MOBILE_RANGE_QUERY = "(max-width: 767px)";
const KEY_ROOTS = [
  "C",
  "Db",
  "D",
  "Eb",
  "E",
  "F",
  "Gb",
  "G",
  "Ab",
  "A",
  "Bb",
  "B",
];
const MATCH_CONFIRMATION_MS = 600;
const UNSUPPORTED_COMPASS_NODE_ID = "__unsupported__";
const ONBOARDING_DISMISSED_STORAGE_KEY = "progresifo.onboardingDismissed";

function shouldShowOnboarding(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return (
      window.localStorage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY) !== "true"
    );
  } catch {
    return true;
  }
}

function persistOnboardingDismissal() {
  try {
    window.localStorage.setItem(ONBOARDING_DISMISSED_STORAGE_KEY, "true");
  } catch {
    // Dismissal should still work for the current session if storage is blocked.
  }
}

function genreLabel(genre: ProgressionGenre): string {
  return genre
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
}

function findNodeIdForPitchClasses(
  genre: ProgressionGenre,
  mode: KeyMode,
  keyRoot: string,
  pitchClasses: string[],
): string | null {
  if (pitchClasses.length === 0) {
    return null;
  }

  const graph = getProgressionGraph(genre, mode);

  return (
    graph.nodes.find((node) => {
      const target = buildTargetVoicingForNode(genre, mode, keyRoot, node.id);
      return doesPitchClassSetMatchTarget(pitchClasses, target.pitchClasses);
    })?.id ?? null
  );
}

function getResponsiveRange(): PianoRange {
  if (
    typeof window === "undefined" ||
    typeof window.matchMedia !== "function"
  ) {
    return FULL_PIANO_RANGE;
  }

  return window.matchMedia(MOBILE_RANGE_QUERY).matches
    ? MOBILE_PIANO_RANGE
    : FULL_PIANO_RANGE;
}

function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function pitchClassSignature(pitchClasses: string[]): string {
  return [...pitchClasses].sort().join("|");
}

export default function App() {
  const [activeNotes, setActiveNotes] = useState<ActiveNote[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding);
  const [activeWorkspace, setActiveWorkspace] =
    useState<WorkspaceMode>("progressions");
  const [
    chordConstructionHintedMidiNumbers,
    setChordConstructionHintedMidiNumbers,
  ] = useState<number[]>([]);
  const [scaleHintedMidiNumbers, setScaleHintedMidiNumbers] = useState<
    number[]
  >([]);
  const [interactionMode, setInteractionMode] =
    useState<PianoInteractionMode>("hold");
  const [progression, setProgression] = useState<ProgressionEntry[]>([]);
  const [progressionGenre, setProgressionGenre] =
    useState<ProgressionGenre>("pop");
  const [progressionKey, setProgressionKey] = useState("C");
  const [keyMode, setKeyMode] = useState<KeyMode>("major");
  const [progressionDisplayMode, setProgressionDisplayMode] =
    useState<ProgressionDisplayMode>("next-moves");
  const [selectedProgressionId, setSelectedProgressionId] = useState<
    string | null
  >(() => getFirstProgressionId("pop", "major"));
  const [activeProgressionStepIndex, setActiveProgressionStepIndex] =
    useState(0);
  const [matchedProgressionStepIndex, setMatchedProgressionStepIndex] =
    useState<number | null>(null);
  const [isProgressionComplete, setIsProgressionComplete] = useState(false);
  const [currentCompassNode, setCurrentCompassNode] =
    useState<CompassNodeView | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] =
    useState<string | null>(null);
  const [matchedSuggestionId, setMatchedSuggestionId] = useState<string | null>(
    null,
  );
  const [pendingMatchedNodeId, setPendingMatchedNodeId] = useState<string | null>(
    null,
  );
  const [range, setRange] = useState<PianoRange>(() => getResponsiveRange());
  const synth = useToneSynth();
  const {
    status: audioStatus,
    enable: enableAudio,
    disable: disableAudio,
    triggerAttack,
    triggerRelease,
  } = synth;

  const resetCompass = useCallback(() => {
    setCurrentCompassNode(null);
    setSelectedSuggestionId(null);
    setMatchedSuggestionId(null);
    setPendingMatchedNodeId(null);
  }, []);
  const resetProgressionPractice = useCallback(
    (genre: ProgressionGenre, mode: KeyMode) => {
      setSelectedProgressionId(getFirstProgressionId(genre, mode));
      setActiveProgressionStepIndex(0);
      setMatchedProgressionStepIndex(null);
      setIsProgressionComplete(false);
    },
    [],
  );
  const dismissOnboarding = useCallback(() => {
    persistOnboardingDismissal();
    setShowOnboarding(false);
  }, []);

  const handleNoteDown = useCallback(
    (
      midi: number,
      source: ActiveNoteSource,
      velocity = 100,
      ownerId?: string,
    ) => {
      setActiveNotes((current) =>
        addActiveNote(current, {
          midi,
          source,
          ownerId,
          velocity,
          startedAt: Date.now(),
        }),
      );
      triggerAttack(midi, velocity);
    },
    [triggerAttack],
  );

  const handleNoteUp = useCallback(
    (midi: number, source: ActiveNoteSource, ownerId?: string) => {
      let shouldReleaseAudio = false;

      flushSync(() => {
        setActiveNotes((current) => {
          const nextActiveNotes = removeActiveNote(
            current,
            midi,
            source,
            ownerId,
          );
          const hasRemainingOwner = nextActiveNotes.some(
            (note) => note.midi === midi,
          );

          shouldReleaseAudio =
            nextActiveNotes.length < current.length && !hasRemainingOwner;

          return nextActiveNotes;
        });
      });

      if (shouldReleaseAudio) {
        triggerRelease(midi);
      }
    },
    [triggerRelease],
  );

  const clearPointerNotes = useCallback(() => {
    const notesToRelease: number[] = [];

    flushSync(() => {
      setActiveNotes((current) => {
        const pointerNotes = current.filter(
          (note) => note.source === "pointer",
        );

        if (pointerNotes.length === 0) {
          return current;
        }

        const nextActiveNotes = removeAllNotesForSource(current, "pointer");

        pointerNotes.forEach((pointerNote) => {
          const hasRemainingOwner = nextActiveNotes.some(
            (note) => note.midi === pointerNote.midi,
          );

          if (
            !hasRemainingOwner &&
            !notesToRelease.includes(pointerNote.midi)
          ) {
            notesToRelease.push(pointerNote.midi);
          }
        });

        return nextActiveNotes;
      });
    });

    notesToRelease.forEach((midi) => {
      triggerRelease(midi);
    });
  }, [triggerRelease]);

  const midiOptions = useMemo(
    () => ({
      onNoteOn: (event: MidiNoteEvent) =>
        handleNoteDown(event.note, "midi", event.velocity, event.input.id),
      onNoteOff: (event: MidiNoteEvent) =>
        handleNoteUp(event.note, "midi", event.input.id),
    }),
    [handleNoteDown, handleNoteUp],
  );
  const midi = useMidiInput(midiOptions);
  const previousMidiStatusRef = useRef(midi.status);
  const midiInputIds = useMemo(
    () => midi.inputs.map((input) => input.id),
    [midi.inputs],
  );
  const previousMidiInputIdsRef = useRef(midiInputIds);
  const inactiveWorkspaceDetectionSignatureRef = useRef<string | null>(null);
  const lastProgressionTrailPrimaryRef = useRef<string | null>(null);
  const matchedProgressionSignatureRef = useRef<string | null>(null);

  const activeMidiNumbers = useMemo(
    () => getUniqueMidiNumbers(activeNotes),
    [activeNotes],
  );
  const latchedPointerMidiNumbers = useMemo(
    () => getUniqueMidiNumbers(
      activeNotes.filter((note) => note.source === "pointer"),
    ),
    [activeNotes],
  );
  const displayNotes = useMemo(() => getDisplayNotes(activeNotes), [activeNotes]);
  const detection = useMemo(() => detectChord(activeNotes), [activeNotes]);
  const detectedProgressionSignature = useMemo(
    () =>
      detection.pitchClasses.length > 0
        ? pitchClassSignature(detection.pitchClasses)
        : null,
    [detection.pitchClasses],
  );
  const detectedCompassNodeId = useMemo(
    () =>
      findNodeIdForPitchClasses(
        progressionGenre,
        keyMode,
        progressionKey,
        detection.pitchClasses,
      ),
    [detection.pitchClasses, keyMode, progressionGenre, progressionKey],
  );
  const unsupportedCompassNode = useMemo<CompassNodeView | null>(() => {
    if (
      activeWorkspace !== "progressions" ||
      (detectedProgressionSignature &&
        detectedProgressionSignature === inactiveWorkspaceDetectionSignatureRef.current)
    ) {
      return null;
    }

    if (!detection.primary || detection.pitchClasses.length === 0) {
      return null;
    }

    if (detectedCompassNodeId) {
      return null;
    }

    return {
      nodeId: UNSUPPORTED_COMPASS_NODE_ID,
      romanNumeral: detection.primary,
      chordName: detection.primary,
      displayName: detection.primary,
    };
  }, [
    activeWorkspace,
    detectedCompassNodeId,
    detectedProgressionSignature,
    detection.pitchClasses.length,
    detection.primary,
  ]);
  const displayedCompassNode = unsupportedCompassNode ?? currentCompassNode;
  const compassSuggestions = useMemo<ProgressionSuggestion[]>(() => {
    if (unsupportedCompassNode) {
      return [];
    }

    if (!currentCompassNode) {
      return getStarterSuggestions(progressionGenre, keyMode, progressionKey);
    }

    return buildProgressionSuggestions(
      progressionGenre,
      keyMode,
      progressionKey,
      currentCompassNode.nodeId,
    );
  }, [
    currentCompassNode,
    keyMode,
    progressionGenre,
    progressionKey,
    unsupportedCompassNode,
  ]);

  const selectedSuggestion =
    compassSuggestions.find(
      (suggestion) => suggestion.id === selectedSuggestionId,
    ) ??
    compassSuggestions[0] ??
    null;
  const resolvedProgressions = useMemo(
    () => getResolvedProgressions(progressionGenre, keyMode, progressionKey),
    [keyMode, progressionGenre, progressionKey],
  );
  const selectedProgression = useMemo(
    () =>
      getResolvedProgression(
        progressionGenre,
        keyMode,
        progressionKey,
        selectedProgressionId,
      ) ??
      resolvedProgressions[0] ??
      null,
    [
      keyMode,
      progressionGenre,
      progressionKey,
      resolvedProgressions,
      selectedProgressionId,
    ],
  );
  const activeProgressionStep =
    selectedProgression?.steps[activeProgressionStepIndex] ?? null;
  const progressionHintedMidiNumbers =
    progressionDisplayMode === "full-progressions"
      ? activeProgressionStep?.target.midiNumbers ?? []
      : selectedSuggestion?.target.midiNumbers ?? [];
  const hintedMidiNumbers =
    activeWorkspace === "chord-construction"
      ? chordConstructionHintedMidiNumbers
      : activeWorkspace === "scales"
        ? scaleHintedMidiNumbers
      : progressionHintedMidiNumbers;

  const handleCompassSuggestionSelect = useCallback(
    (suggestionId: string) => {
      setSelectedSuggestionId(suggestionId);

      const suggestion = compassSuggestions.find(
        (candidate) => candidate.id === suggestionId,
      );

      if (!currentCompassNode && suggestion) {
        setCurrentCompassNode(
          buildCompassNodeView(
            progressionGenre,
            keyMode,
            progressionKey,
            suggestion.nodeId,
          ),
        );
      }
    },
    [
      compassSuggestions,
      currentCompassNode,
      keyMode,
      progressionGenre,
      progressionKey,
    ],
  );
  const handleProgressionSelect = useCallback((progressionId: string) => {
    setSelectedProgressionId(progressionId);
    setActiveProgressionStepIndex(0);
    setMatchedProgressionStepIndex(null);
    setIsProgressionComplete(false);
  }, []);

  const handleProgressionStepSelect = useCallback((stepIndex: number) => {
    setActiveProgressionStepIndex(stepIndex);
    setMatchedProgressionStepIndex(null);
    setIsProgressionComplete(false);
  }, []);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof window.matchMedia !== "function"
    ) {
      return;
    }

    const mediaQuery = window.matchMedia(MOBILE_RANGE_QUERY);
    const syncRange = () => {
      setRange(mediaQuery.matches ? MOBILE_PIANO_RANGE : FULL_PIANO_RANGE);
    };

    syncRange();
    mediaQuery.addEventListener("change", syncRange);

    return () => {
      mediaQuery.removeEventListener("change", syncRange);
    };
  }, []);

  useEffect(() => {
    if (activeWorkspace !== "progressions") {
      lastProgressionTrailPrimaryRef.current = detection.primary;
      return;
    }

    if (detection.primary === lastProgressionTrailPrimaryRef.current) {
      return;
    }

    lastProgressionTrailPrimaryRef.current = detection.primary;
    setProgression((current) =>
      addChordToProgression(current, detection.primary, Date.now()),
    );
  }, [activeWorkspace, detection.primary]);

  useEffect(() => {
    if (activeWorkspace !== "progressions") {
      inactiveWorkspaceDetectionSignatureRef.current =
        detectedProgressionSignature;
      return;
    }

    if (
      detectedProgressionSignature &&
      detectedProgressionSignature === inactiveWorkspaceDetectionSignatureRef.current
    ) {
      return;
    }

    inactiveWorkspaceDetectionSignatureRef.current = null;

    if (
      currentCompassNode &&
      findMatchingSuggestion(compassSuggestions, detection.pitchClasses)
    ) {
      return;
    }

    if (!detectedCompassNodeId) {
      if (detection.primary && currentCompassNode) {
        setCurrentCompassNode(null);
      }

      if (detection.primary) {
        setMatchedSuggestionId(null);
        setPendingMatchedNodeId(null);
      }

      return;
    }

    setCurrentCompassNode((current) => {
      if (current?.nodeId === detectedCompassNodeId) {
        return current;
      }

      return buildCompassNodeView(
        progressionGenre,
        keyMode,
        progressionKey,
        detectedCompassNodeId,
      );
    });
  }, [
    activeWorkspace,
    compassSuggestions,
    currentCompassNode,
    detectedCompassNodeId,
    detectedProgressionSignature,
    detection.primary,
    detection.pitchClasses,
    keyMode,
    progressionGenre,
    progressionKey,
  ]);

  useEffect(() => {
    if (activeWorkspace !== "progressions") {
      return;
    }

    setSelectedSuggestionId(compassSuggestions[0]?.id ?? null);
    setMatchedSuggestionId(null);
  }, [compassSuggestions]);

  useEffect(() => {
    if (activeWorkspace !== "progressions") {
      return;
    }

    if (
      !pendingMatchedNodeId ||
      !detectedCompassNodeId ||
      detectedCompassNodeId === pendingMatchedNodeId
    ) {
      return;
    }

    setMatchedSuggestionId(null);
    setPendingMatchedNodeId(null);
  }, [activeWorkspace, detectedCompassNodeId, pendingMatchedNodeId]);

  useEffect(() => {
    if (
      activeWorkspace !== "progressions" ||
      (detectedProgressionSignature &&
        detectedProgressionSignature === inactiveWorkspaceDetectionSignatureRef.current)
    ) {
      return;
    }

    if (compassSuggestions.length === 0 || detection.pitchClasses.length === 0) {
      return;
    }

    const matchedSuggestion = findMatchingSuggestion(
      compassSuggestions,
      detection.pitchClasses,
    );

    if (!matchedSuggestion || matchedSuggestion.id === matchedSuggestionId) {
      return;
    }

    setMatchedSuggestionId(matchedSuggestion.id);
    setPendingMatchedNodeId(matchedSuggestion.nodeId);
  }, [
    activeWorkspace,
    compassSuggestions,
    detectedProgressionSignature,
    detection.pitchClasses,
    matchedSuggestionId,
  ]);

  useEffect(() => {
    if (activeWorkspace !== "progressions") {
      return;
    }

    if (!pendingMatchedNodeId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCurrentCompassNode(
        buildCompassNodeView(
          progressionGenre,
          keyMode,
          progressionKey,
          pendingMatchedNodeId,
        ),
      );
      setMatchedSuggestionId(null);
      setPendingMatchedNodeId(null);
    }, MATCH_CONFIRMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [
    activeWorkspace,
    keyMode,
    pendingMatchedNodeId,
    progressionGenre,
    progressionKey,
  ]);

  useEffect(() => {
    if (
      activeWorkspace !== "progressions" ||
      progressionDisplayMode !== "full-progressions" ||
      !selectedProgression ||
      !activeProgressionStep
    ) {
      matchedProgressionSignatureRef.current =
        activeWorkspace === "progressions" ? null : detectedProgressionSignature;
      setMatchedProgressionStepIndex(null);
      return;
    }

    if (detectedProgressionSignature === null) {
      matchedProgressionSignatureRef.current = null;
      setMatchedProgressionStepIndex(null);
      return;
    }

    if (
      matchedProgressionSignatureRef.current !== null &&
      matchedProgressionSignatureRef.current !== detectedProgressionSignature
    ) {
      matchedProgressionSignatureRef.current = null;
    }

    if (
      !doesProgressionStepMatchPitchClasses(
        activeProgressionStep,
        detection.pitchClasses,
      )
    ) {
      setMatchedProgressionStepIndex(null);
      return;
    }

    if (
      matchedProgressionSignatureRef.current === detectedProgressionSignature
    ) {
      return;
    }

    matchedProgressionSignatureRef.current = detectedProgressionSignature;
    setMatchedProgressionStepIndex(activeProgressionStepIndex);

    const isLastStep =
      activeProgressionStepIndex === selectedProgression.steps.length - 1;

    const timeoutId = window.setTimeout(() => {
      if (isLastStep) {
        setActiveProgressionStepIndex(0);
        setIsProgressionComplete(true);
      } else {
        setActiveProgressionStepIndex(activeProgressionStepIndex + 1);
      }

      setMatchedProgressionStepIndex(null);
    }, MATCH_CONFIRMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
      setMatchedProgressionStepIndex(null);
    };
  }, [
    activeWorkspace,
    activeProgressionStep,
    activeProgressionStepIndex,
    detectedProgressionSignature,
    progressionDisplayMode,
    selectedProgression,
  ]);

  useEffect(() => {
    if (!isProgressionComplete) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsProgressionComplete(false);
    }, MATCH_CONFIRMATION_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isProgressionComplete]);

  useEffect(() => {
    setCurrentCompassNode(null);
  }, [keyMode, progressionGenre, progressionKey]);

  useEffect(() => {
    setSelectedProgressionId(getFirstProgressionId(progressionGenre, keyMode));
    setActiveProgressionStepIndex(0);
    setMatchedProgressionStepIndex(null);
    setIsProgressionComplete(false);
  }, [keyMode, progressionGenre, progressionKey]);

  useEffect(() => {
    if (
      selectedProgression &&
      activeProgressionStepIndex >= selectedProgression.steps.length
    ) {
      setActiveProgressionStepIndex(0);
    }
  }, [activeProgressionStepIndex, selectedProgression]);

  useEffect(() => {
    if (interactionMode !== "latch") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== " " || isEditableKeyboardTarget(event.target)) {
        return;
      }

      event.preventDefault();
      clearPointerNotes();
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [clearPointerNotes, interactionMode]);

  useEffect(() => {
    const previousStatus = previousMidiStatusRef.current;
    const previousMidiInputIds = previousMidiInputIdsRef.current;
    const currentMidiInputIds = new Set(midiInputIds);
    const removedMidiInputIds = previousMidiInputIds.filter(
      (inputId) => !currentMidiInputIds.has(inputId),
    );
    const removeAllMidiNotes =
      previousStatus === "connected" && midi.status !== "connected";

    previousMidiStatusRef.current = midi.status;
    previousMidiInputIdsRef.current = midiInputIds;

    if (!removeAllMidiNotes && removedMidiInputIds.length === 0) {
      return;
    }

    const notesToRelease: number[] = [];

    flushSync(() => {
      setActiveNotes((current) => {
        const midiNotes = current.filter(
          (note) =>
            note.source === "midi" &&
            (removeAllMidiNotes ||
              (note.ownerId !== undefined &&
                removedMidiInputIds.includes(note.ownerId))),
        );

        if (midiNotes.length === 0) {
          return current;
        }

        const nextActiveNotes = removeAllMidiNotes
          ? removeAllNotesForSource(current, "midi")
          : removedMidiInputIds.reduce(
              (notes, inputId) =>
                removeAllNotesForSource(notes, "midi", inputId),
              current,
            );

        midiNotes.forEach((midiNote) => {
          const hasRemainingOwner = nextActiveNotes.some(
            (note) => note.midi === midiNote.midi,
          );

          if (
            !hasRemainingOwner &&
            !notesToRelease.includes(midiNote.midi)
          ) {
            notesToRelease.push(midiNote.midi);
          }
        });

        return nextActiveNotes;
      });
    });

    notesToRelease.forEach((midi) => {
      triggerRelease(midi);
    });
  }, [midi.status, midiInputIds, triggerRelease]);

  return (
    <main
      className={`app-shell${showOnboarding ? " app-shell--onboarding" : ""}`}
    >
      <StatusBar
        audioStatus={audioStatus}
        midiDeviceCount={midi.inputs.length}
        midiError={midi.error?.message ?? null}
        midiStatus={midi.status}
        onConnectMidi={midi.connect}
        onDisableAudio={disableAudio}
        onEnableAudio={enableAudio}
        interactionMode={interactionMode}
        onInteractionModeChange={setInteractionMode}
      />
      {showOnboarding ? (
        <OnboardingGuide onDismiss={dismissOnboarding} />
      ) : null}

      <section className="app-workspace" aria-label="Piano chord learning">
        <div className="app-workspace__surface">
          <div className="app-workspace__header">
            <WorkspaceTabs
              activeWorkspace={activeWorkspace}
              onWorkspaceChange={setActiveWorkspace}
            />
            {activeWorkspace === "progressions" ? (
              <div className="app-workspace__controls">
                <section
                  className="progression-controls"
                  aria-label="Progression settings"
                >
                  <label className="progression-controls__field">
                    <span>Genre</span>
                    <select
                      aria-label="Progression genre"
                      value={progressionGenre}
                      onChange={(event) => {
                        const nextGenre = event.target
                          .value as ProgressionGenre;

                        resetCompass();
                        resetProgressionPractice(nextGenre, keyMode);
                        setProgressionGenre(nextGenre);
                      }}
                    >
                      {PROGRESSION_GENRES.map((genre) => (
                        <option key={genre} value={genre}>
                          {genreLabel(genre)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="progression-controls__field">
                    <span>Key</span>
                    <select
                      aria-label="Progression key"
                      value={progressionKey}
                      onChange={(event) => {
                        resetCompass();
                        resetProgressionPractice(progressionGenre, keyMode);
                        setProgressionKey(event.target.value);
                      }}
                    >
                      {KEY_ROOTS.map((keyRoot) => (
                        <option key={keyRoot} value={keyRoot}>
                          {keyRoot}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="progression-controls__field">
                    <span>Mode</span>
                    <select
                      aria-label="Key mode"
                      value={keyMode}
                      onChange={(event) => {
                        const nextKeyMode = event.target.value as KeyMode;

                        resetCompass();
                        resetProgressionPractice(progressionGenre, nextKeyMode);
                        setKeyMode(nextKeyMode);
                      }}
                    >
                      <option value="major">Major</option>
                      <option value="minor">Minor</option>
                    </select>
                  </label>
                </section>
                <div
                  className="progression-mode-toggle"
                  aria-label="Progression display mode"
                  role="group"
                >
                  <button
                    aria-pressed={progressionDisplayMode === "next-moves"}
                    onClick={() => setProgressionDisplayMode("next-moves")}
                    type="button"
                  >
                    Next moves
                  </button>
                  <button
                    aria-pressed={
                      progressionDisplayMode === "full-progressions"
                    }
                    onClick={() =>
                      setProgressionDisplayMode("full-progressions")
                    }
                    type="button"
                  >
                    Full progressions
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          <div className="app-workspace__readout">
            <div
              aria-labelledby="workspace-tab-progressions"
              hidden={activeWorkspace !== "progressions"}
              id="workspace-panel-progressions"
              role="tabpanel"
            >
              {activeWorkspace === "progressions" ? (
                <div className="progression-workspace">
                  <ChordReadout
                    detection={detection}
                    displayNotes={displayNotes}
                  />
                  <div className="progression-workspace__guidance">
                    {progressionDisplayMode === "next-moves" ? (
                      <ProgressionCompass
                        currentNode={displayedCompassNode}
                        matchedSuggestionId={matchedSuggestionId}
                        onSuggestionSelect={handleCompassSuggestionSelect}
                        selectedSuggestionId={selectedSuggestion?.id ?? null}
                        suggestions={compassSuggestions}
                      />
                    ) : (
                      <ProgressionPracticeRail
                        activeStepIndex={activeProgressionStepIndex}
                        isComplete={isProgressionComplete}
                        matchedStepIndex={matchedProgressionStepIndex}
                        onProgressionSelect={handleProgressionSelect}
                        onStepSelect={handleProgressionStepSelect}
                        progressions={resolvedProgressions}
                        selectedProgression={selectedProgression}
                      />
                    )}
                    <ProgressionTrail entries={progression} />
                  </div>
                </div>
              ) : null}
            </div>
            <div
              aria-labelledby="workspace-tab-chord-construction"
              hidden={activeWorkspace !== "chord-construction"}
              id="workspace-panel-chord-construction"
              role="tabpanel"
            >
              {activeWorkspace === "chord-construction" ? (
                <ChordConstructionPanel
                  activePitchClasses={detection.pitchClasses}
                  appKeyMode={keyMode}
                  appKeyRoot={progressionKey}
                  onTargetChange={setChordConstructionHintedMidiNumbers}
                  targetRange={range}
                />
              ) : null}
            </div>
            <div
              aria-labelledby="workspace-tab-scales"
              hidden={activeWorkspace !== "scales"}
              id="workspace-panel-scales"
              role="tabpanel"
            >
              {activeWorkspace === "scales" ? (
                <ScaleLearningPanel
                  activePitchClasses={detection.pitchClasses}
                  appKeyRoot={progressionKey}
                  onTargetChange={setScaleHintedMidiNumbers}
                  targetRange={range}
                />
              ) : null}
            </div>
          </div>
        </div>

        <PianoKeyboard
          activeMidiNumbers={activeMidiNumbers}
          hintedMidiNumbers={hintedMidiNumbers}
          interactionMode={interactionMode}
          latchedMidiNumbers={latchedPointerMidiNumbers}
          onNoteDown={(midiNumber) => handleNoteDown(midiNumber, "pointer")}
          onNoteUp={(midiNumber) => handleNoteUp(midiNumber, "pointer")}
          range={range}
        />
      </section>
    </main>
  );
}
