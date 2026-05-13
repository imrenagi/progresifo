import { Cable, MousePointer2, Music2, Volume2, VolumeX } from "lucide-react";
import type { AudioStatus } from "../audio/useToneSynth";
import type { MidiStatus } from "../midi/useMidiInput";
import type { PianoInteractionMode } from "../music/types";

type StatusBarProps = {
  midiStatus: MidiStatus;
  midiDeviceCount: number;
  midiError: string | null;
  onConnectMidi: () => void;
  audioStatus: AudioStatus;
  onEnableAudio: () => void;
  onDisableAudio: () => void;
  interactionMode: PianoInteractionMode;
  onInteractionModeChange: (mode: PianoInteractionMode) => void;
};

function midiStatusLabel(status: MidiStatus, deviceCount: number): string {
  if (status === "unsupported") {
    return "MIDI unsupported";
  }

  if (status === "permission-needed") {
    return "MIDI permission needed";
  }

  if (status === "connected") {
    return `${deviceCount} MIDI input${deviceCount === 1 ? "" : "s"} connected`;
  }

  if (status === "disconnected") {
    return "No MIDI inputs";
  }

  return "MIDI error";
}

function audioStatusLabel(status: AudioStatus): string {
  if (status === "on") {
    return "Sound on";
  }

  if (status === "starting") {
    return "Sound starting";
  }

  return "Sound off";
}

export function StatusBar({
  midiStatus,
  midiDeviceCount,
  midiError,
  onConnectMidi,
  audioStatus,
  onEnableAudio,
  onDisableAudio,
  interactionMode,
  onInteractionModeChange,
}: StatusBarProps) {
  const audioOn = audioStatus === "on";
  const audioStarting = audioStatus === "starting";

  return (
    <header className="status-bar">
      <div className="status-bar__brand">
        <span className="status-bar__brand-icon">
          <Music2 aria-hidden="true" size={20} />
        </span>
        <div>
          <h1 className="status-bar__title">Progresifo</h1>
          <p className="status-bar__subtitle">Piano chord workspace</p>
        </div>
      </div>

      <div className="status-bar__controls">
        <div
          className="status-bar__segmented"
          aria-label="Mouse interaction mode"
          data-onboarding-target="interaction-mode"
        >
          <MousePointer2 aria-hidden="true" size={16} />
          <button
            aria-label="Hold mode"
            aria-pressed={interactionMode === "hold"}
            className="status-bar__segment"
            onClick={() => onInteractionModeChange("hold")}
            type="button"
          >
            Hold
          </button>
          <button
            aria-label="Latch mode"
            aria-pressed={interactionMode === "latch"}
            className="status-bar__segment"
            onClick={() => onInteractionModeChange("latch")}
            type="button"
          >
            Latch
          </button>
        </div>
        <button
          className="status-bar__button"
          data-onboarding-target="midi-status"
          onClick={onConnectMidi}
          type="button"
        >
          <Cable aria-hidden="true" size={16} />
          <span>{midiStatusLabel(midiStatus, midiDeviceCount)}</span>
        </button>
        <button
          className="status-bar__button"
          data-onboarding-target="sound-toggle"
          disabled={audioStarting}
          onClick={audioOn ? onDisableAudio : onEnableAudio}
          type="button"
        >
          {audioOn ? (
            <Volume2 aria-hidden="true" size={16} />
          ) : (
            <VolumeX aria-hidden="true" size={16} />
          )}
          <span>{audioStatusLabel(audioStatus)}</span>
        </button>
      </div>

      {midiStatus === "unsupported" ? (
        <p className="status-bar__message" role="status">
          Web MIDI is unavailable in this browser.
        </p>
      ) : null}
      {midiError ? (
        <p className="status-bar__message status-bar__message--error" role="alert">
          {midiError}
        </p>
      ) : null}
      {audioStatus === "error" ? (
        <p className="status-bar__message status-bar__message--error" role="alert">
          Sound could not be started.
        </p>
      ) : null}
    </header>
  );
}
