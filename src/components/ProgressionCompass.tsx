import type { CompassNodeView, ProgressionSuggestion } from "../music/types";

type ProgressionCompassProps = {
  currentNode: CompassNodeView | null;
  suggestions: ProgressionSuggestion[];
  selectedSuggestionId: string | null;
  matchedSuggestionId: string | null;
  onSuggestionSelect: (suggestionId: string) => void;
};

function labelText(value: string): string {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function ProgressionCompass({
  currentNode,
  suggestions,
  selectedSuggestionId,
  matchedSuggestionId,
  onSuggestionSelect,
}: ProgressionCompassProps) {
  return (
    <section className="progression-compass" aria-label="Progression compass">
      <div className="progression-compass__header">
        <div>
          <p className="progression-compass__label">
            {currentNode ? "You are here" : "Starter ideas"}
          </p>
          <h2 className="progression-compass__heading">
            {currentNode?.displayName ?? "Choose a first chord"}
          </h2>
        </div>
      </div>

      {suggestions.length > 0 ? (
        <div className="progression-compass__suggestions">
          {suggestions.map((suggestion) => {
            const selected = suggestion.id === selectedSuggestionId;
            const matched = suggestion.id === matchedSuggestionId;

            return (
              <button
                aria-pressed={selected}
                aria-label={suggestion.displayName}
                className="progression-compass__card"
                data-matched={matched}
                data-selected={selected}
                key={suggestion.id}
                onClick={() => onSuggestionSelect(suggestion.id)}
                type="button"
              >
                <span className="progression-compass__card-title">
                  {suggestion.displayName}
                </span>
                <span className="progression-compass__meta">
                  {labelText(suggestion.functionLabel)} · {labelText(suggestion.difficulty)}
                </span>
                <span className="progression-compass__keys">
                  Press {suggestion.target.noteNames.join(" ")}
                </span>
                <span className="progression-compass__reason">
                  {suggestion.reason}
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="progression-compass__empty">
          No curated moves for this chord in this genre yet.
        </p>
      )}
    </section>
  );
}
