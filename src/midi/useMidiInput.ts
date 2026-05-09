import { useCallback, useEffect, useRef, useState } from "react";
import { parseMidiMessage } from "./parseMidiMessage";

export type MidiStatus =
  | "unsupported"
  | "permission-needed"
  | "connected"
  | "disconnected"
  | "error";

export type MidiInputDevice = {
  id: string;
  name: string;
  manufacturer: string;
};

export type MidiNoteEvent = {
  note: number;
  velocity?: number;
  input: MidiInputDevice;
};

type UseMidiInputOptions = {
  onNoteOn?: (event: MidiNoteEvent) => void;
  onNoteOff?: (event: MidiNoteEvent) => void;
};

type UseMidiInputResult = {
  status: MidiStatus;
  inputs: MidiInputDevice[];
  error: Error | null;
  connect: () => Promise<void>;
};

function supportsMidi(): boolean {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.requestMIDIAccess === "function"
  );
}

function summarizeInput(input: MIDIInput): MidiInputDevice {
  return {
    id: input.id,
    name: input.name ?? "MIDI input",
    manufacturer: input.manufacturer ?? "",
  };
}

function getInputs(access: MIDIAccess): MIDIInput[] {
  return Array.from(access.inputs.values());
}

function getStatusForInputs(inputs: MIDIInput[]): MidiStatus {
  return inputs.some((input) => input.state === "connected")
    ? "connected"
    : "disconnected";
}

export function useMidiInput(
  options: UseMidiInputOptions = {},
): UseMidiInputResult {
  const callbacksRef = useRef(options);
  const accessRef = useRef<MIDIAccess | null>(null);
  const [status, setStatus] = useState<MidiStatus>(() =>
    supportsMidi() ? "permission-needed" : "unsupported",
  );
  const [inputs, setInputs] = useState<MidiInputDevice[]>([]);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    callbacksRef.current = options;
  }, [options]);

  const syncInputs = useCallback((access: MIDIAccess) => {
    const nextInputs = getInputs(access);
    setInputs(nextInputs.map(summarizeInput));
    setStatus(getStatusForInputs(nextInputs));
  }, []);

  const detachListeners = useCallback((access: MIDIAccess) => {
    access.onstatechange = null;
    getInputs(access).forEach((input) => {
      input.onmidimessage = null;
    });
  }, []);

  const attachListeners = useCallback(
    (access: MIDIAccess) => {
      getInputs(access).forEach((input) => {
        input.onmidimessage = (event) => {
          if (!event.data) {
            return;
          }

          const parsed = parseMidiMessage(event.data);
          const device = summarizeInput(input);

          if (parsed.type === "note-on") {
            callbacksRef.current.onNoteOn?.({
              note: parsed.note,
              velocity: parsed.velocity,
              input: device,
            });
            return;
          }

          if (parsed.type === "note-off") {
            callbacksRef.current.onNoteOff?.({
              note: parsed.note,
              input: device,
            });
          }
        };
      });

      access.onstatechange = () => {
        syncInputs(access);
        attachListeners(access);
      };
    },
    [syncInputs],
  );

  const connect = useCallback(async () => {
    if (!supportsMidi()) {
      setStatus("unsupported");
      return;
    }

    try {
      setError(null);
      const access = await navigator.requestMIDIAccess({ sysex: false });

      if (accessRef.current && accessRef.current !== access) {
        detachListeners(accessRef.current);
      }

      accessRef.current = access;
      syncInputs(access);
      attachListeners(access);
    } catch (caught) {
      setError(caught instanceof Error ? caught : new Error(String(caught)));
      setStatus("error");
    }
  }, [attachListeners, detachListeners, syncInputs]);

  useEffect(() => {
    if (!supportsMidi()) {
      setStatus("unsupported");
    }

    return () => {
      if (accessRef.current) {
        detachListeners(accessRef.current);
      }
    };
  }, [detachListeners]);

  return {
    status,
    inputs,
    error,
    connect,
  };
}
