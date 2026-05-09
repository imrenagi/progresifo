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

type InstalledMidiMessageHandler = {
  input: MIDIInput;
  handler: MIDIInput["onmidimessage"];
  previous: MIDIInput["onmidimessage"];
};

type InstalledStateChangeHandler = {
  access: MIDIAccess;
  handler: MIDIAccess["onstatechange"];
  previous: MIDIAccess["onstatechange"];
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
  const isMountedRef = useRef(false);
  const requestIdRef = useRef(0);
  const midiHandlersRef = useRef<InstalledMidiMessageHandler[]>([]);
  const stateHandlerRef = useRef<InstalledStateChangeHandler | null>(null);
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

  const detachInstalledHandlers = useCallback(() => {
    const stateHandler = stateHandlerRef.current;
    if (
      stateHandler &&
      stateHandler.access.onstatechange === stateHandler.handler
    ) {
      stateHandler.access.onstatechange = stateHandler.previous;
    }
    stateHandlerRef.current = null;

    midiHandlersRef.current.forEach(({ input, handler, previous }) => {
      if (input.onmidimessage === handler) {
        input.onmidimessage = previous;
      }
    });
    midiHandlersRef.current = [];
  }, []);

  const attachListeners = useCallback(
    (access: MIDIAccess) => {
      detachInstalledHandlers();

      getInputs(access).forEach((input) => {
        const previous = input.onmidimessage;
        const handler: MIDIInput["onmidimessage"] = (event) => {
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

        input.onmidimessage = handler;
        midiHandlersRef.current.push({ input, handler, previous });
      });

      const previous = access.onstatechange;
      const handler: MIDIAccess["onstatechange"] = () => {
        syncInputs(access);
        attachListeners(access);
      };

      access.onstatechange = handler;
      stateHandlerRef.current = { access, handler, previous };
    },
    [detachInstalledHandlers, syncInputs],
  );

  const connect = useCallback(async () => {
    if (!supportsMidi()) {
      setStatus("unsupported");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    try {
      setError(null);
      const access = await navigator.requestMIDIAccess({ sysex: false });

      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      if (accessRef.current && accessRef.current !== access) {
        detachInstalledHandlers();
      }

      accessRef.current = access;
      syncInputs(access);
      attachListeners(access);
    } catch (caught) {
      if (!isMountedRef.current || requestId !== requestIdRef.current) {
        return;
      }

      setError(caught instanceof Error ? caught : new Error(String(caught)));
      setStatus("error");
    }
  }, [attachListeners, detachInstalledHandlers, syncInputs]);

  useEffect(() => {
    isMountedRef.current = true;

    if (!supportsMidi()) {
      setStatus("unsupported");
    }

    return () => {
      isMountedRef.current = false;
      requestIdRef.current += 1;
      detachInstalledHandlers();
    };
  }, [detachInstalledHandlers]);

  return {
    status,
    inputs,
    error,
    connect,
  };
}
