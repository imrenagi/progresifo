export type ProgressionEntry = {
  id: string;
  name: string;
  detectedAt: number;
};

const MAX_PROGRESSION_LENGTH = 8;

export function addChordToProgression(
  entries: ProgressionEntry[],
  chordName: string | null,
  detectedAt: number,
): ProgressionEntry[] {
  if (!chordName) {
    return entries;
  }

  if (entries.at(-1)?.name === chordName) {
    return entries;
  }

  const nextEntry: ProgressionEntry = {
    id: `${chordName}-${detectedAt}`,
    name: chordName,
    detectedAt,
  };

  return [...entries, nextEntry].slice(-MAX_PROGRESSION_LENGTH);
}
