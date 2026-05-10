import type { ChordConstructionExample } from "../music/types";

type ChordExampleListProps = {
  inScaleExamples: ChordConstructionExample[];
  onScaleRootExamples: ChordConstructionExample[];
  selectedExampleId: string | null;
  onExampleSelect: (exampleId: string) => void;
};

function ExampleButton({
  example,
  selected,
  onExampleSelect,
}: {
  example: ChordConstructionExample;
  selected: boolean;
  onExampleSelect: (exampleId: string) => void;
}) {
  return (
    <button
      aria-pressed={selected}
      className="chord-example-list__button"
      data-selected={selected}
      onClick={() => onExampleSelect(example.id)}
      type="button"
    >
      <span className="chord-example-list__name">{example.chordName}</span>
      <span className="chord-example-list__notes">
        {example.target.pitchClasses.join(" ")}
      </span>
    </button>
  );
}

export function ChordExampleList({
  inScaleExamples,
  onScaleRootExamples,
  selectedExampleId,
  onExampleSelect,
}: ChordExampleListProps) {
  return (
    <div className="chord-example-list">
      <section
        aria-label="In this scale"
        className="chord-example-list__section"
        role="group"
      >
        <h3 className="chord-example-list__heading">In this scale</h3>
        {inScaleExamples.length > 0 ? (
          <div className="chord-example-list__buttons">
            {inScaleExamples.map((example) => (
              <ExampleButton
                example={example}
                key={example.id}
                onExampleSelect={onExampleSelect}
                selected={example.id === selectedExampleId}
              />
            ))}
          </div>
        ) : (
          <p className="chord-example-list__empty">
            No fully scale-native examples for this chord type.
          </p>
        )}
      </section>

      <section
        aria-label="Try on scale roots"
        className="chord-example-list__section"
        role="group"
      >
        <h3 className="chord-example-list__heading">Try on scale roots</h3>
        <div className="chord-example-list__buttons">
          {onScaleRootExamples.map((example) => (
            <ExampleButton
              example={example}
              key={example.id}
              onExampleSelect={onExampleSelect}
              selected={example.id === selectedExampleId}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
