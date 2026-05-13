import { buildPianoKeys } from "../music/notes";
import type { PianoKey } from "../music/types";

type MiniPianoMapProps = {
  label: string;
  pitchClasses: string[];
};

const MINI_PIANO_RANGE = { start: 60, end: 71 };
const BLACK_KEY_WIDTH_RATIO = 0.72;
const BLACK_KEY_LEFT_OFFSET = 0.36;

type PositionedMiniPianoKey = PianoKey & {
  whiteIndex: number;
};

function positionKeys(keys: PianoKey[]): PositionedMiniPianoKey[] {
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

export function MiniPianoMap({ label, pitchClasses }: MiniPianoMapProps) {
  const highlightedSet = new Set(pitchClasses);
  const keys = positionKeys(buildPianoKeys(MINI_PIANO_RANGE));
  const whiteKeys = keys.filter((key) => !key.isBlack);
  const blackKeys = keys.filter((key) => key.isBlack);
  const whiteKeyCount = whiteKeys.length;

  const renderKey = (key: PositionedMiniPianoKey) => {
    const style = key.isBlack
      ? {
          left: `calc(((100% / ${whiteKeyCount}) * ${key.whiteIndex}) - ((100% / ${whiteKeyCount}) * ${BLACK_KEY_LEFT_OFFSET}))`,
          width: `calc((100% / ${whiteKeyCount}) * ${BLACK_KEY_WIDTH_RATIO})`,
        }
      : undefined;

    return (
      <span
        aria-label={key.name}
        className={`mini-piano-map__key ${
          key.isBlack
            ? "mini-piano-map__key--black"
            : "mini-piano-map__key--white"
        }`}
        data-highlighted={highlightedSet.has(key.pitchClass)}
        key={key.midi}
        style={style}
      >
        {!key.isBlack ? key.pitchClass : null}
      </span>
    );
  };

  return (
    <div aria-label={label} className="mini-piano-map" role="img">
      <div className="mini-piano-map__white-keys">
        {whiteKeys.map((key) => renderKey(key))}
      </div>
      <div className="mini-piano-map__black-keys">
        {blackKeys.map((key) => renderKey(key))}
      </div>
    </div>
  );
}
