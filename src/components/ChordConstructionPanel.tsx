import { useEffect, useMemo, useState } from "react";
import {
  buildChordConstructionExamples,
  buildChordTarget,
  buildScalePitchClasses,
  doesPitchClassSetMatchChordTarget,
  getChordTypeById,
} from "../music/chordConstruction";
import type {
  ChordConstructionExample,
  KeyMode,
  PianoRange,
} from "../music/types";
import { ChordExampleList } from "./ChordExampleList";
import { ChordTypeDetail } from "./ChordTypeDetail";
import { ChordTypeList } from "./ChordTypeList";

type ChordConstructionPanelProps = {
  activePitchClasses: string[];
  appKeyMode: KeyMode;
  appKeyRoot: string;
  onTargetChange: (midiNumbers: number[]) => void;
  targetRange?: PianoRange;
};

const ROOT_OPTIONS = [
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

function getChordName(root: string, symbol: string): string {
  return `${root}${symbol}`;
}

function findExampleById(
  examples: ChordConstructionExample[],
  exampleId: string | null,
): ChordConstructionExample | null {
  if (!exampleId) {
    return null;
  }

  return examples.find((example) => example.id === exampleId) ?? null;
}

export function ChordConstructionPanel({
  activePitchClasses,
  appKeyMode,
  appKeyRoot,
  onTargetChange,
  targetRange,
}: ChordConstructionPanelProps) {
  const [selectedChordTypeId, setSelectedChordTypeId] = useState("major");
  const [localRoot, setLocalRoot] = useState(appKeyRoot);
  const [localMode, setLocalMode] = useState<KeyMode>(appKeyMode);
  const [selectedExampleId, setSelectedExampleId] = useState<string | null>(null);

  useEffect(() => {
    setLocalRoot(appKeyRoot);
    setLocalMode(appKeyMode);
    setSelectedExampleId(null);
  }, [appKeyMode, appKeyRoot]);

  const chordType = useMemo(
    () => getChordTypeById(selectedChordTypeId),
    [selectedChordTypeId],
  );

  const examples = useMemo(
    () =>
      buildChordConstructionExamples(chordType, localRoot, localMode, targetRange),
    [chordType, localMode, localRoot, targetRange],
  );
  const allExamples = useMemo(
    () => [...examples.inScale, ...examples.onScaleRoots],
    [examples.inScale, examples.onScaleRoots],
  );
  const selectedExample = findExampleById(allExamples, selectedExampleId);
  const activeRootTarget = useMemo(
    () => buildChordTarget(localRoot, chordType, targetRange),
    [chordType, localRoot, targetRange],
  );
  const target = selectedExample?.target ?? activeRootTarget;
  const targetChordName = selectedExample?.chordName ?? getChordName(localRoot, chordType.symbol);
  const scaleLabel = `${localRoot} ${localMode}`;
  const matched = doesPitchClassSetMatchChordTarget(
    activePitchClasses,
    target.pitchClasses,
  );

  useEffect(() => {
    onTargetChange(target.midiNumbers);
  }, [onTargetChange, target]);

  return (
    <section className="chord-construction" aria-label="Chord construction">
      <div className="chord-construction__controls">
        <label>
          Chord root
          <select
            onChange={(event) => {
              setLocalRoot(event.target.value);
              setSelectedExampleId(null);
            }}
            value={localRoot}
          >
            {ROOT_OPTIONS.map((root) => (
              <option key={root} value={root}>
                {root}
              </option>
            ))}
          </select>
        </label>
        <label>
          Mode
          <select
            onChange={(event) => {
              setLocalMode(event.target.value as KeyMode);
              setSelectedExampleId(null);
            }}
            value={localMode}
          >
            <option value="major">major</option>
            <option value="minor">minor</option>
          </select>
        </label>
        <p className="chord-construction__scale">
          {buildScalePitchClasses(localRoot, localMode).join(" ")}
        </p>
      </div>

      <ChordTypeList
        onChordTypeSelect={(chordTypeId) => {
          setSelectedChordTypeId(chordTypeId);
          setSelectedExampleId(null);
        }}
        selectedChordTypeId={selectedChordTypeId}
      />

      <ChordTypeDetail
        chordName={targetChordName}
        chordType={chordType}
        matched={matched}
        scaleLabel={scaleLabel}
        target={target}
      />

      <ChordExampleList
        inScaleExamples={examples.inScale}
        onExampleSelect={setSelectedExampleId}
        onScaleRootExamples={examples.onScaleRoots}
        selectedExampleId={selectedExampleId}
      />
    </section>
  );
}
