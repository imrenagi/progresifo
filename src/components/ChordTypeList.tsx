import {
  CHORD_FAMILY_ORDER,
  getChordTypesByFamily,
} from "../music/chordConstruction";
import type { ChordType } from "../music/types";

type ChordTypeListProps = {
  selectedChordTypeId: string;
  onChordTypeSelect: (chordTypeId: string) => void;
};

const FAMILY_LABELS = {
  triads: "Triads",
  "suspended-add": "Suspended & add",
  sixths: "Sixths",
  sevenths: "Sevenths",
  extended: "Extended",
  altered: "Altered",
} as const;

function getSymbolLabel(chordType: ChordType): string {
  return chordType.symbol || "maj";
}

export function ChordTypeList({
  selectedChordTypeId,
  onChordTypeSelect,
}: ChordTypeListProps) {
  return (
    <div className="chord-type-list">
      {CHORD_FAMILY_ORDER.map((family) => (
        <section
          aria-label={FAMILY_LABELS[family]}
          className="chord-type-list__family"
          key={family}
          role="group"
        >
          <h3 className="chord-type-list__family-heading">
            {FAMILY_LABELS[family]}
          </h3>
          <div className="chord-type-list__buttons">
            {getChordTypesByFamily(family).map((chordType) => {
              const selected = chordType.id === selectedChordTypeId;

              return (
                <button
                  aria-label={chordType.name}
                  aria-pressed={selected}
                  className="chord-type-list__button"
                  data-selected={selected}
                  key={chordType.id}
                  onClick={() => onChordTypeSelect(chordType.id)}
                  type="button"
                >
                  <span className="chord-type-list__name">{chordType.name}</span>
                  <span className="chord-type-list__symbol">
                    {getSymbolLabel(chordType)}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
