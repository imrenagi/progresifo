import type { ResolvedProgression } from "../music/types";

type ProgressionPracticeRailProps = {
  activeStepIndex: number;
  isComplete: boolean;
  matchedStepIndex: number | null;
  progressions: ResolvedProgression[];
  selectedProgression: ResolvedProgression | null;
  onProgressionSelect: (progressionId: string) => void;
  onStepSelect: (stepIndex: number) => void;
};

export function ProgressionPracticeRail({
  activeStepIndex,
  isComplete,
  matchedStepIndex,
  progressions,
  selectedProgression,
  onProgressionSelect,
  onStepSelect,
}: ProgressionPracticeRailProps) {
  return (
    <section className="progression-practice" aria-label="Full progressions">
      <div className="progression-practice__browser">
        <div className="progression-practice__header">
          <div>
            <p className="progression-practice__label">Curated progressions</p>
            <h2 className="progression-practice__heading">Choose a progression</h2>
          </div>
        </div>

        {progressions.length > 0 ? (
          <div className="progression-practice__cards">
            {progressions.map((progression) => {
              const selected = progression.id === selectedProgression?.id;
              const cardTitleId = `progression-practice-${progression.id}-title`;
              const cardSequenceId = `progression-practice-${progression.id}-sequence`;
              const cardDescriptionId = `progression-practice-${progression.id}-description`;

              return (
                <button
                  aria-describedby={
                    progression.description
                      ? `${cardSequenceId} ${cardDescriptionId}`
                      : cardSequenceId
                  }
                  aria-labelledby={cardTitleId}
                  aria-pressed={selected}
                  className="progression-practice__card"
                  data-selected={selected}
                  key={progression.id}
                  onClick={() => onProgressionSelect(progression.id)}
                  type="button"
                >
                  <span
                    className="progression-practice__card-title"
                    id={cardTitleId}
                  >
                    {progression.name}
                  </span>
                  <span
                    className="progression-practice__sequence"
                    id={cardSequenceId}
                  >
                    {progression.displaySequence}
                  </span>
                  {progression.description ? (
                    <span
                      className="progression-practice__description"
                      id={cardDescriptionId}
                    >
                      {progression.description}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="progression-practice__empty">
            No curated full progressions for this selection yet.
          </p>
        )}
      </div>

      <div className="progression-practice__rail">
        <div className="progression-practice__header">
          <div>
            <p className="progression-practice__label">Practice rail</p>
            <h2 className="progression-practice__heading">
              {selectedProgression?.name ?? "No progression selected"}
            </h2>
          </div>
        </div>

        {isComplete ? (
          <p className="progression-practice__complete">Progression complete</p>
        ) : null}

        {selectedProgression ? (
          <ol className="progression-practice__steps" aria-label="Practice steps">
            {selectedProgression.steps.map((step, index) => {
              const active = index === activeStepIndex;
              const matched = index === matchedStepIndex;
              const matchedStatusId = `progression-practice-${selectedProgression.id}-${index}-matched`;

              return (
                <li key={`${step.nodeId}:${index}`}>
                  <button
                    aria-current={active ? "step" : undefined}
                    aria-describedby={matched ? matchedStatusId : undefined}
                    aria-label={`Step ${index + 1}: ${step.displayName}`}
                    className="progression-practice__step"
                    data-active={active}
                    data-matched={matched}
                    onClick={() => onStepSelect(index)}
                    type="button"
                  >
                    <span className="progression-practice__step-number">
                      {index + 1}
                    </span>
                    <span className="progression-practice__step-body">
                      <span className="progression-practice__step-name">
                        {step.displayName}
                      </span>
                      <span className="progression-practice__keys">
                        {step.target.noteNames.join(" ")}
                      </span>
                    </span>
                    {matched ? (
                      <span
                        className="progression-practice__matched"
                        id={matchedStatusId}
                      >
                        Matched
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="progression-practice__empty">
            Select a progression to see chord keys.
          </p>
        )}
      </div>
    </section>
  );
}
