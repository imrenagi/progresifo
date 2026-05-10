import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useToneSynth } from "./audio/useToneSynth";
import { ChordReadout } from "./components/ChordReadout";
import { PianoKeyboard } from "./components/PianoKeyboard";
import { ProgressionCompass } from "./components/ProgressionCompass";
import { ProgressionTrail } from "./components/ProgressionTrail";
import { StatusBar } from "./components/StatusBar";
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
import { PROGRESSION_GENRES } from "./music/progressionGraph";
import {
  buildCompassNodeView,
  buildProgressionSuggestions,
  getStarterSuggestions,
} from "./music/progressionCompass";
import { addChordToProgression, type ProgressionEntry } from "./music/progression";
import type {
  ActiveNote,
  ActiveNoteSource,
  CompassNodeView,
  KeyMode,
  PianoInteractionMode,
  PianoRange,
  ProgressionGenre,
  ProgressionSuggestion,
} from "./music/types";

const MOBILE_RANGE_QUERY = "(max-width: 767px)";
const KEY_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

function genreLabel(genre: ProgressionGenre): string {
  return genre
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("-");
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

export default function App() {
  const [activeNotes, setActiveNotes] = useState<ActiveNote[]>([]);
  const [interactionMode, setInteractionMode] =
    useState<PianoInteractionMode>("hold");
  const [progression, setProgression] = useState<ProgressionEntry[]>([]);
  const [progressionGenre, setProgressionGenre] =
    useState<ProgressionGenre>("pop");
  const [progressionKey, setProgressionKey] = useState("C");
  const [keyMode, setKeyMode] = useState<KeyMode>("major");
  const [currentCompassNode, setCurrentCompassNode] =
    useState<CompassNodeView | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] =
    useState<string | null>(null);
  const [matchedSuggestionId, setMatchedSuggestionId] = useState<string | null>(
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
  const compassSuggestions = useMemo<ProgressionSuggestion[]>(() => {
    if (!currentCompassNode) {
      return getStarterSuggestions(progressionGenre, keyMode, progressionKey);
    }

    return buildProgressionSuggestions(
      progressionGenre,
      keyMode,
      progressionKey,
      currentCompassNode.nodeId,
    );
  }, [currentCompassNode, keyMode, progressionGenre, progressionKey]);

  const selectedSuggestion =
    compassSuggestions.find(
      (suggestion) => suggestion.id === selectedSuggestionId,
    ) ??
    compassSuggestions[0] ??
    null;

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
    setProgression((current) =>
      addChordToProgression(current, detection.primary, Date.now()),
    );
  }, [detection.primary]);

  useEffect(() => {
    setSelectedSuggestionId(compassSuggestions[0]?.id ?? null);
    setMatchedSuggestionId(null);
  }, [compassSuggestions]);

  useEffect(() => {
    setCurrentCompassNode(null);
  }, [keyMode, progressionGenre, progressionKey]);

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
    <main className="app-shell">
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

      <section className="app-workspace" aria-label="Piano chord learning">
        <div className="app-workspace__readout">
          <section className="progression-controls" aria-label="Progression settings">
            <label className="progression-controls__field">
              <span>Genre</span>
              <select
                aria-label="Progression genre"
                value={progressionGenre}
                onChange={(event) => {
                  resetCompass();
                  setProgressionGenre(event.target.value as ProgressionGenre);
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
                  resetCompass();
                  setKeyMode(event.target.value as KeyMode);
                }}
              >
                <option value="major">Major</option>
                <option value="minor">Minor</option>
              </select>
            </label>
          </section>
          <ChordReadout detection={detection} displayNotes={displayNotes} />
          <ProgressionCompass
            currentNode={currentCompassNode}
            matchedSuggestionId={matchedSuggestionId}
            onSuggestionSelect={handleCompassSuggestionSelect}
            selectedSuggestionId={selectedSuggestion?.id ?? null}
            suggestions={compassSuggestions}
          />
          <ProgressionTrail entries={progression} />
        </div>

        <PianoKeyboard
          activeMidiNumbers={activeMidiNumbers}
          hintedMidiNumbers={selectedSuggestion?.target.midiNumbers ?? []}
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
