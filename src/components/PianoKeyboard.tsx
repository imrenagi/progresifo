import type { CSSProperties, PointerEvent } from "react";
import { buildPianoKeys } from "../music/notes";
import type { PianoKey, PianoRange } from "../music/types";

type PianoKeyboardProps = {
  activeMidiNumbers: number[];
  range: PianoRange;
  onNoteDown: (midi: number) => void;
  onNoteUp: (midi: number) => void;
};

type PositionedPianoKey = PianoKey & {
  whiteIndex: number;
};

const BLACK_KEY_WIDTH_RATIO = 0.72;
const BLACK_KEY_LEFT_OFFSET = 0.36;

function positionKeys(keys: PianoKey[]): PositionedPianoKey[] {
  let whiteKeyCount = 0;

  return keys.map((key) => {
    const positionedKey = {
      ...key,
      whiteIndex: whiteKeyCount,
    };

    if (!key.isBlack) {
      whiteKeyCount += 1;
    }

    return positionedKey;
  });
}

function capturePointer(event: PointerEvent<HTMLButtonElement>) {
  if (typeof event.currentTarget.setPointerCapture !== "function") {
    return;
  }

  try {
    event.currentTarget.setPointerCapture(event.pointerId);
  } catch {
    // Some test/browser environments expose the method but reject synthetic IDs.
  }
}

export function PianoKeyboard({
  activeMidiNumbers,
  range,
  onNoteDown,
  onNoteUp,
}: PianoKeyboardProps) {
  const keys = positionKeys(buildPianoKeys(range));
  const activeSet = new Set(activeMidiNumbers);
  const whiteKeys = keys.filter((key) => !key.isBlack);
  const blackKeys = keys.filter((key) => key.isBlack);
  const whiteKeyCount = whiteKeys.length;

  const renderKey = (key: PositionedPianoKey) => {
    const isActive = activeSet.has(key.midi);
    const style = key.isBlack
      ? {
          left: `calc(((100% / ${whiteKeyCount}) * ${key.whiteIndex}) - ((100% / ${whiteKeyCount}) * ${BLACK_KEY_LEFT_OFFSET}))`,
          width: `calc((100% / ${whiteKeyCount}) * ${BLACK_KEY_WIDTH_RATIO})`,
        }
      : undefined;

    return (
      <button
        aria-label={key.name}
        aria-pressed={isActive}
        className={`piano-key ${
          key.isBlack ? "piano-key--black" : "piano-key--white"
        }`}
        data-active={isActive}
        key={key.midi}
        onBlur={() => onNoteUp(key.midi)}
        onPointerCancel={() => onNoteUp(key.midi)}
        onPointerDown={(event) => {
          capturePointer(event);
          onNoteDown(key.midi);
        }}
        onPointerUp={() => onNoteUp(key.midi)}
        style={style}
        type="button"
      >
        <span className="piano-key__label">{key.pitchClass}</span>
      </button>
    );
  };

  return (
    <section aria-label="Piano keyboard" className="piano-shell">
      <div
        className="piano-keyboard"
        style={{ "--white-key-count": whiteKeyCount } as CSSProperties}
      >
        <div className="piano-keyboard__white-keys">
          {whiteKeys.map((key) => renderKey(key))}
        </div>
        <div className="piano-keyboard__black-keys">
          {blackKeys.map((key) => renderKey(key))}
        </div>
      </div>
    </section>
  );
}
