import {
  getScaleTypesByFamily,
  SCALE_FAMILY_ORDER,
} from "../music/scales";
import type { ScaleFamily } from "../music/types";

type ScaleTypeListProps = {
  selectedScaleTypeId: string;
  onScaleTypeSelect: (scaleTypeId: string) => void;
};

const FAMILY_LABELS: Record<ScaleFamily, string> = {
  core: "Core",
  "pentatonic-blues": "Pentatonic & blues",
  modes: "Modes",
  symmetric: "Symmetric",
};

export function ScaleTypeList({
  selectedScaleTypeId,
  onScaleTypeSelect,
}: ScaleTypeListProps) {
  return (
    <section className="scale-type-list" aria-label="Scale types">
      {SCALE_FAMILY_ORDER.map((family) => (
        <section
          aria-label={FAMILY_LABELS[family]}
          className="scale-type-list__family"
          key={family}
          role="group"
        >
          <h3 className="scale-type-list__family-heading">
            {FAMILY_LABELS[family]}
          </h3>
          <div className="scale-type-list__buttons">
            {getScaleTypesByFamily(family).map((scaleType) => {
              const selected = scaleType.id === selectedScaleTypeId;

              return (
                <button
                  aria-label={scaleType.name}
                  aria-pressed={selected}
                  className="scale-type-list__button"
                  data-selected={selected}
                  key={scaleType.id}
                  onClick={() => onScaleTypeSelect(scaleType.id)}
                  type="button"
                >
                  <span className="scale-type-list__name">{scaleType.name}</span>
                  <span className="scale-type-list__formula">
                    Formula {scaleType.formula}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </section>
  );
}
