import type { ChordDetection } from "../music/types";

type ChordReadoutProps = {
  detection: ChordDetection;
  displayNotes: string[];
};

export function ChordReadout({ detection, displayNotes }: ChordReadoutProps) {
  const primary = detection.primary ?? "No chord";
  const notesText =
    displayNotes.length > 0 ? displayNotes.join(" ") : "Press three or more notes";

  return (
    <section className="chord-readout" aria-label="Current chord">
      <div className="chord-readout__primary">
        <p className="chord-readout__label">Current chord</p>
        <h2 className="chord-readout__heading">{primary}</h2>
        <p className="chord-readout__notes">{notesText}</p>
        {detection.pitchClasses.length > 0 ? (
          <p className="chord-readout__pitch-classes">
            Pitch classes: {detection.pitchClasses.join(" ")}
          </p>
        ) : null}
      </div>

      <aside className="chord-readout__alternates" aria-label="Alternate chord names">
        <p className="chord-readout__label">Alternate names</p>
        {detection.alternatives.length > 0 ? (
          <ul className="chord-readout__alternate-list">
            {detection.alternatives.map((candidate) => (
              <li className="chord-readout__alternate" key={candidate}>
                {candidate}
              </li>
            ))}
          </ul>
        ) : (
          <p className="chord-readout__empty">No alternate names</p>
        )}
      </aside>
    </section>
  );
}
