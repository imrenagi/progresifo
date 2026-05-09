export type ParsedMidiMessage =
  | {
      type: "note-on";
      note: number;
      velocity: number;
    }
  | {
      type: "note-off";
      note: number;
    }
  | {
      type: "ignored";
    };

export function parseMidiMessage(data: ArrayLike<number>): ParsedMidiMessage {
  const status = data[0] ?? 0;
  const note = data[1] ?? 0;
  const velocity = data[2] ?? 0;
  const command = status & 0xf0;

  if (command === 0x90) {
    if (velocity > 0) {
      return { type: "note-on", note, velocity };
    }

    return { type: "note-off", note };
  }

  if (command === 0x80) {
    return { type: "note-off", note };
  }

  return { type: "ignored" };
}
