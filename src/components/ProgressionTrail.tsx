import type { ProgressionEntry } from "../music/progression";

type ProgressionTrailProps = {
  entries: ProgressionEntry[];
};

export function ProgressionTrail({ entries }: ProgressionTrailProps) {
  return (
    <section className="progression-trail" aria-label="Recent progression">
      <p className="progression-trail__label">Recent progression</p>
      {entries.length > 0 ? (
        <ol className="progression-trail__list">
          {entries.map((entry) => (
            <li className="progression-trail__entry" key={entry.id}>
              {entry.name}
            </li>
          ))}
        </ol>
      ) : (
        <p className="progression-trail__empty">
          Detected chords will appear here.
        </p>
      )}
    </section>
  );
}
