import { useEffect, useMemo, useState } from "react";
import {
  buildScaleTarget,
  doesPitchClassSetMatchScaleTarget,
  getScaleTypeById,
} from "../music/scales";
import type { PianoRange } from "../music/types";
import { ScaleTypeDetail } from "./ScaleTypeDetail";
import { ScaleTypeList } from "./ScaleTypeList";

type ScaleLearningPanelProps = {
  activePitchClasses: string[];
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

function getScaleLabel(root: string, scaleName: string): string {
  return `${root} ${scaleName.toLowerCase()}`;
}

export function ScaleLearningPanel({
  activePitchClasses,
  appKeyRoot,
  onTargetChange,
  targetRange,
}: ScaleLearningPanelProps) {
  const [localRoot, setLocalRoot] = useState(appKeyRoot);
  const [selectedScaleTypeId, setSelectedScaleTypeId] = useState("major");

  useEffect(() => {
    setLocalRoot(appKeyRoot);
  }, [appKeyRoot]);

  const scaleType = useMemo(
    () => getScaleTypeById(selectedScaleTypeId),
    [selectedScaleTypeId],
  );
  const target = useMemo(
    () => buildScaleTarget(localRoot, scaleType, targetRange),
    [localRoot, scaleType, targetRange],
  );
  const scaleLabel = getScaleLabel(localRoot, scaleType.name);
  const matched = doesPitchClassSetMatchScaleTarget(
    activePitchClasses,
    target.pitchClasses,
  );

  useEffect(() => {
    onTargetChange(target.midiNumbers);
  }, [onTargetChange, target.midiNumbers]);

  return (
    <section className="scale-learning" aria-label="Scale learning">
      <div className="scale-learning__controls">
        <label>
          Scale root
          <select
            onChange={(event) => setLocalRoot(event.target.value)}
            value={localRoot}
          >
            {ROOT_OPTIONS.map((root) => (
              <option key={root} value={root}>
                {root}
              </option>
            ))}
          </select>
        </label>
        <p className="scale-learning__active-notes">
          Scale notes: {target.noteNames.join(" ")}
        </p>
      </div>

      <ScaleTypeList
        onScaleTypeSelect={setSelectedScaleTypeId}
        selectedScaleTypeId={selectedScaleTypeId}
      />
      <ScaleTypeDetail
        matched={matched}
        scaleLabel={scaleLabel}
        scaleType={scaleType}
        target={target}
      />
    </section>
  );
}
