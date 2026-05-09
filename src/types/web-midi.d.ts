export {};

declare global {
  interface MIDIPort extends EventTarget {
    readonly connection: MIDIPortConnectionState;
    readonly id: string;
    readonly manufacturer: string | null;
    readonly name: string | null;
    onstatechange: ((this: MIDIPort, ev: MIDIConnectionEvent) => any) | null;
    readonly state: MIDIPortDeviceState;
    readonly type: MIDIPortType;
    readonly version: string | null;
    close(): Promise<MIDIPort>;
    open(): Promise<MIDIPort>;
  }

  interface MIDIInput extends MIDIPort {
    onmidimessage: ((this: MIDIInput, ev: MIDIMessageEvent) => any) | null;
  }

  interface MIDIOutput extends MIDIPort {
    send(data: number[], timestamp?: DOMHighResTimeStamp): void;
  }

  interface MIDIInputMap extends ReadonlyMap<string, MIDIInput> {}

  interface MIDIOutputMap extends ReadonlyMap<string, MIDIOutput> {}

  interface MIDIMessageEvent extends Event {
    readonly data: Uint8Array<ArrayBuffer> | null;
  }

  interface MIDIConnectionEvent extends Event {
    readonly port: MIDIPort | null;
  }

  interface MIDIAccess extends EventTarget {
    readonly inputs: MIDIInputMap;
    onstatechange:
      | ((this: MIDIAccess, ev: MIDIConnectionEvent) => any)
      | null;
    readonly outputs: MIDIOutputMap;
    readonly sysexEnabled: boolean;
  }

  interface Navigator {
    requestMIDIAccess(options?: MIDIOptions): Promise<MIDIAccess>;
  }
}
