import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useMidiInput } from "../useMidiInput";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

function createInput(overrides: Partial<MIDIInput> = {}): MIDIInput {
  return {
    id: "input-1",
    name: "Test Keys",
    manufacturer: "Acme",
    state: "connected",
    onmidimessage: null,
    ...overrides,
  } as MIDIInput;
}

function createAccess(inputs: MIDIInput[]): MIDIAccess {
  const access = Object.assign(new EventTarget(), {
    inputs: new Map<string, MIDIInput>(
      inputs.map((input) => [input.id, input]),
    ),
    outputs: new Map<string, MIDIOutput>(),
    onstatechange: null,
    sysexEnabled: false,
  });

  return access as MIDIAccess;
}

function installMidiAccess(access: MIDIAccess | Promise<MIDIAccess>) {
  const requestMIDIAccess = vi.fn(() => Promise.resolve(access));

  Object.defineProperty(navigator, "requestMIDIAccess", {
    configurable: true,
    value: requestMIDIAccess,
  });

  return requestMIDIAccess;
}

function message(data: number[]): MIDIMessageEvent {
  return { data: new Uint8Array(data) } as MIDIMessageEvent;
}

afterEach(() => {
  vi.restoreAllMocks();
  Reflect.deleteProperty(navigator, "requestMIDIAccess");
});

describe("useMidiInput", () => {
  it("does not attach handlers when MIDI access resolves after unmount", async () => {
    const input = createInput();
    const access = createAccess([input]);
    const deferred = createDeferred<MIDIAccess>();
    installMidiAccess(deferred.promise);
    const { result, unmount } = renderHook(() => useMidiInput());

    let connectPromise!: Promise<void>;
    act(() => {
      connectPromise = result.current.connect();
    });
    unmount();
    await act(async () => {
      deferred.resolve(access);
      await connectPromise;
    });

    expect(input.onmidimessage).toBeNull();
    expect(access.onstatechange).toBeNull();
  });

  it("restores pre-existing property handlers on cleanup", async () => {
    const preExistingMidiHandler = vi.fn();
    const preExistingStateHandler = vi.fn();
    const input = createInput({
      onmidimessage: preExistingMidiHandler,
    });
    const access = createAccess([input]);
    access.onstatechange = preExistingStateHandler;
    installMidiAccess(access);
    const { result, unmount } = renderHook(() => useMidiInput());

    await act(async () => {
      await result.current.connect();
    });
    unmount();

    expect(input.onmidimessage).toBe(preExistingMidiHandler);
    expect(access.onstatechange).toBe(preExistingStateHandler);
  });

  it("attaches handlers and emits note callbacks on MIDI note messages", async () => {
    const onNoteOn = vi.fn();
    const onNoteOff = vi.fn();
    const input = createInput();
    const access = createAccess([input]);
    installMidiAccess(access);
    const { result } = renderHook(() =>
      useMidiInput({
        onNoteOn,
        onNoteOff,
      }),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(input.onmidimessage).toEqual(expect.any(Function));
    expect(access.onstatechange).toEqual(expect.any(Function));

    input.onmidimessage?.call(input, message([0x90, 60, 100]));
    input.onmidimessage?.call(input, message([0x80, 60, 64]));

    expect(onNoteOn).toHaveBeenCalledWith({
      note: 60,
      velocity: 100,
      input: {
        id: "input-1",
        name: "Test Keys",
        manufacturer: "Acme",
      },
    });
    expect(onNoteOff).toHaveBeenCalledWith({
      note: 60,
      input: {
        id: "input-1",
        name: "Test Keys",
        manufacturer: "Acme",
      },
    });
  });
});
