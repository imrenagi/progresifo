import { useRef, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { buildPianoKeys } from "../music/notes";
import type { PianoInteractionMode, PianoKey, PianoRange } from "../music/types";

type PianoKeyboardProps = {
  activeMidiNumbers: number[];
  interactionMode?: PianoInteractionMode;
  latchedMidiNumbers?: number[];
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

function isPlayableKeyboardKey(key: string): boolean {
  return key === " " || key === "Enter";
}

function deleteHeldPointerForMidi(
  heldPointerIds: Map<number, number>,
  midi: number,
): boolean {
  for (const [pointerId, heldMidi] of heldPointerIds) {
    if (heldMidi === midi) {
      heldPointerIds.delete(pointerId);
      return true;
    }
  }

  return false;
}

export function PianoKeyboard({
  activeMidiNumbers,
  interactionMode = "hold",
  latchedMidiNumbers = activeMidiNumbers,
  range,
  onNoteDown,
  onNoteUp,
}: PianoKeyboardProps) {
  const heldKeyboardMidiRef = useRef<Set<number>>(new Set());
  const heldPointerIdsRef = useRef<Map<number, number>>(new Map());
  const keys = positionKeys(buildPianoKeys(range));
  const activeSet = new Set(activeMidiNumbers);
  const latchedSet = new Set(latchedMidiNumbers);
  const whiteKeys = keys.filter((key) => !key.isBlack);
  const blackKeys = keys.filter((key) => key.isBlack);
  const whiteKeyCount = whiteKeys.length;

  const pressPointerNote = (
    key: PositionedPianoKey,
    event: PointerEvent<HTMLButtonElement>,
  ) => {
    capturePointer(event);

    if (interactionMode === "latch") {
      if (latchedSet.has(key.midi)) {
        onNoteUp(key.midi);
      } else {
        onNoteDown(key.midi);
      }

      return;
    }

    if (heldPointerIdsRef.current.get(event.pointerId) === key.midi) {
      return;
    }

    heldPointerIdsRef.current.set(event.pointerId, key.midi);
    onNoteDown(key.midi);
  };

  const releasePointerNote = (
    key: PositionedPianoKey,
    event: PointerEvent<HTMLButtonElement>,
  ) => {
    if (interactionMode === "latch") {
      return;
    }

    if (heldPointerIdsRef.current.get(event.pointerId) !== key.midi) {
      if (!deleteHeldPointerForMidi(heldPointerIdsRef.current, key.midi)) {
        return;
      }
    } else {
      heldPointerIdsRef.current.delete(event.pointerId);
    }

    onNoteUp(key.midi);
  };

  const pressKeyboardNote = (
    key: PositionedPianoKey,
    event: KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (!isPlayableKeyboardKey(event.key)) {
      return;
    }

    event.preventDefault();

    if (heldKeyboardMidiRef.current.has(key.midi)) {
      return;
    }

    heldKeyboardMidiRef.current.add(key.midi);
    onNoteDown(key.midi);
  };

  const releaseKeyboardNote = (
    key: PositionedPianoKey,
    event: KeyboardEvent<HTMLButtonElement>,
  ) => {
    if (!isPlayableKeyboardKey(event.key)) {
      return;
    }

    event.preventDefault();

    if (!heldKeyboardMidiRef.current.has(key.midi)) {
      return;
    }

    heldKeyboardMidiRef.current.delete(key.midi);
    onNoteUp(key.midi);
  };

  const renderKey = (key: PositionedPianoKey) => {
    const isActive = activeSet.has(key.midi);
    const visibleLabel = key.name === "C4" ? key.name : null;
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
        onKeyDown={(event) => pressKeyboardNote(key, event)}
        onKeyUp={(event) => releaseKeyboardNote(key, event)}
        onPointerCancel={(event) => releasePointerNote(key, event)}
        onPointerDown={(event) => pressPointerNote(key, event)}
        onPointerUp={(event) => releasePointerNote(key, event)}
        style={style}
        type="button"
      >
        {visibleLabel ? (
          <span className="piano-key__label">{visibleLabel}</span>
        ) : null}
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
