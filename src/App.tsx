import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useToneSynth } from "./audio/useToneSynth";
import { ChordReadout } from "./components/ChordReadout";
import { PianoKeyboard } from "./components/PianoKeyboard";
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
import { addChordToProgression, type ProgressionEntry } from "./music/progression";
import type {
  ActiveNote,
  ActiveNoteSource,
  PianoInteractionMode,
  PianoRange,
} from "./music/types";

const MOBILE_RANGE_QUERY = "(max-width: 767px)";

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
  const [range, setRange] = useState<PianoRange>(() => getResponsiveRange());
  const synth = useToneSynth();
  const {
    status: audioStatus,
    enable: enableAudio,
    disable: disableAudio,
    triggerAttack,
    triggerRelease,
  } = synth;

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
          <ChordReadout detection={detection} displayNotes={displayNotes} />
          <ProgressionTrail entries={progression} />
        </div>

        <PianoKeyboard
          activeMidiNumbers={activeMidiNumbers}
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
