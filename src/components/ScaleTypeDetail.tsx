import type { ScaleTarget, ScaleType } from "../music/types";
import { MiniPianoMap } from "./MiniPianoMap";
import { ScaleStaff } from "./ScaleStaff";

type ScaleTypeDetailProps = {
  matched: boolean;
  scaleLabel: string;
  scaleType: ScaleType;
  target: ScaleTarget;
};

function labelGenre(genre: string): string {
  return genre.charAt(0).toUpperCase() + genre.slice(1);
}

export function ScaleTypeDetail({
  matched,
  scaleLabel,
  scaleType,
  target,
}: ScaleTypeDetailProps) {
  return (
    <section className="scale-type-detail" aria-label="Selected scale details">
      <p className="scale-type-detail__scale">{scaleLabel}</p>
      <div className="scale-type-detail__header">
        <div>
          <h2 className="scale-type-detail__heading">{scaleType.name}</h2>
          <p className="scale-type-detail__notes">
            {target.noteNames.join(" ")}
          </p>
        </div>
        <span className="scale-type-detail__match" data-matched={matched}>
          {matched ? "Matched" : "Play all scale notes"}
        </span>
      </div>

      <dl className="scale-type-detail__facts">
        <div>
          <dt>Formula</dt>
          <dd>{scaleType.formula}</dd>
        </div>
        <div>
          <dt>Steps</dt>
          <dd>{scaleType.steps}</dd>
        </div>
      </dl>

      <div className="scale-type-detail__visuals">
        <MiniPianoMap
          label={`Mini piano map for ${scaleLabel}`}
          pitchClasses={target.pitchClasses}
        />
        <ScaleStaff label={`Staff notation for ${scaleLabel}`} target={target} />
      </div>

      <section className="scale-type-detail__section">
        <h3>How it is built</h3>
        <p>{scaleType.description}</p>
      </section>
      <section className="scale-type-detail__section">
        <h3>Where it is used</h3>
        <p>{scaleType.usage}</p>
      </section>
      <section className="scale-type-detail__section">
        <h3>Common genres</h3>
        <p>{scaleType.genres.map(labelGenre).join(", ")}</p>
      </section>
    </section>
  );
}
