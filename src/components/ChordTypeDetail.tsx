import type { ChordType, TargetVoicing } from "../music/types";

type ChordTypeDetailProps = {
  chordName: string;
  chordType: ChordType;
  matched: boolean;
  scaleLabel: string;
  target: TargetVoicing;
};

function labelFunctionTag(tag: string): string {
  return tag.charAt(0).toUpperCase() + tag.slice(1);
}

export function ChordTypeDetail({
  chordName,
  chordType,
  matched,
  scaleLabel,
  target,
}: ChordTypeDetailProps) {
  return (
    <section className="chord-type-detail" aria-label="Selected chord details">
      <p className="chord-type-detail__scale">{scaleLabel}</p>
      <div className="chord-type-detail__header">
        <div>
          <h2 className="chord-type-detail__heading">{chordType.name}</h2>
          <p className="chord-type-detail__name">
            {chordName} {chordType.name}
          </p>
        </div>
        <span className="chord-type-detail__match" data-matched={matched}>
          {matched ? "Matched" : "Play the target"}
        </span>
      </div>

      <dl className="chord-type-detail__facts">
        <div>
          <dt>Formula</dt>
          <dd>{chordType.formula}</dd>
        </div>
        <div>
          <dt>Target notes</dt>
          <dd>Target notes: {target.noteNames.join(" ")}</dd>
        </div>
      </dl>

      <section className="chord-type-detail__section">
        <h3>How to build it</h3>
        <p>{chordType.description}</p>
      </section>
      <section className="chord-type-detail__section">
        <h3>When to use it</h3>
        <p>{chordType.usage}</p>
      </section>
      <section className="chord-type-detail__section">
        <h3>How it feels</h3>
        <p>{chordType.feeling}</p>
      </section>
      <section className="chord-type-detail__section">
        <h3>Common moves</h3>
        <p>{chordType.examples.join(", ")}</p>
        <p>{chordType.commonFunctions.map(labelFunctionTag).join(", ")}</p>
      </section>
    </section>
  );
}
