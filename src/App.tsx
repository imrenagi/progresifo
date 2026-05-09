import { useCallback, useEffect, useMemo, useState } from "react";
import { useToneSynth } from "./audio/useToneSynth";
import { ChordReadout } from "./components/ChordReadout";
import { PianoKeyboard } from "./components/PianoKeyboard";
import { ProgressionTrail } from "./components/ProgressionTrail";
import { StatusBar } from "./components/StatusBar";
import { useMidiInput } from "./midi/useMidiInput";
import {
  addActiveNote,
  getDisplayNotes,
  getUniqueMidiNumbers,
  removeActiveNote,
} from "./music/activeNotes";
import { detectChord } from "./music/chords";
import {
  FULL_PIANO_RANGE,
  MOBILE_PIANO_RANGE,
} from "./music/notes";
import { addChordToProgression, type ProgressionEntry } from "./music/progression";
import type { ActiveNote, ActiveNoteSource, PianoRange } from "./music/types";

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

export default function App() {
  const [activeNotes, setActiveNotes] = useState<ActiveNote[]>([]);
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
    (midi: number, source: ActiveNoteSource, velocity = 100) => {
      setActiveNotes((current) =>
        addActiveNote(current, {
          midi,
          source,
          velocity,
          startedAt: Date.now(),
        }),
      );
      triggerAttack(midi, velocity);
    },
    [triggerAttack],
  );

  const handleNoteUp = useCallback(
    (midi: number, source: ActiveNoteSource) => {
      const sourceOwnsNote = activeNotes.some(
        (note) => note.midi === midi && note.source === source,
      );
      const hasRemainingOwner = activeNotes.some(
        (note) => note.midi === midi && note.source !== source,
      );

      setActiveNotes((current) => removeActiveNote(current, midi, source));

      if (sourceOwnsNote && !hasRemainingOwner) {
        triggerRelease(midi);
      }
    },
    [activeNotes, triggerRelease],
  );

  const midiOptions = useMemo(
    () => ({
      onNoteOn: (event: { note: number; velocity?: number }) =>
        handleNoteDown(event.note, "midi", event.velocity),
      onNoteOff: (event: { note: number }) => handleNoteUp(event.note, "midi"),
    }),
    [handleNoteDown, handleNoteUp],
  );
  const midi = useMidiInput(midiOptions);

  const activeMidiNumbers = useMemo(
    () => getUniqueMidiNumbers(activeNotes),
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
      />

      <section className="app-workspace" aria-label="Piano chord learning">
        <div className="app-workspace__readout">
          <ChordReadout detection={detection} displayNotes={displayNotes} />
          <ProgressionTrail entries={progression} />
        </div>

        <PianoKeyboard
          activeMidiNumbers={activeMidiNumbers}
          onNoteDown={(midiNumber) => handleNoteDown(midiNumber, "pointer")}
          onNoteUp={(midiNumber) => handleNoteUp(midiNumber, "pointer")}
          range={range}
        />
      </section>
    </main>
  );
}
