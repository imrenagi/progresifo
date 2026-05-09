import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useToneSynth } from "../useToneSynth";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
};

const start = vi.fn<() => Promise<void>>();
const toDestination = vi.fn();
const triggerAttack = vi.fn();
const triggerRelease = vi.fn();
const releaseAll = vi.fn();
const dispose = vi.fn();
const Synth = vi.fn();
const PolySynth = vi.fn();

vi.mock("tone", () => ({
  start,
  Synth,
  PolySynth,
}));

function createDeferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

beforeEach(() => {
  start.mockReset();
  start.mockResolvedValue();
  toDestination.mockClear();
  toDestination.mockReturnThis();
  triggerAttack.mockClear();
  triggerRelease.mockClear();
  releaseAll.mockClear();
  dispose.mockClear();
  Synth.mockClear();
  PolySynth.mockClear();
  PolySynth.mockImplementation(function polySynthMock() {
    return {
      toDestination,
      triggerAttack,
      triggerRelease,
      releaseAll,
      dispose,
    };
  });
});

describe("useToneSynth", () => {
  it("keeps audio off until enabled and configures the synth", async () => {
    const { result } = renderHook(() => useToneSynth());

    expect(result.current.status).toBe("off");
    result.current.triggerAttack(60);

    expect(triggerAttack).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.enable();
    });

    expect(start).toHaveBeenCalledTimes(1);
    expect(PolySynth).toHaveBeenCalledWith(Synth, {
      oscillator: { type: "triangle" },
      envelope: {
        attack: 0.01,
        decay: 0.18,
        sustain: 0.45,
        release: 0.8,
      },
    });
    expect(toDestination).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("on");
  });

  it("triggers each sounding note once until it is released", async () => {
    const { result } = renderHook(() => useToneSynth());

    await act(async () => {
      await result.current.enable();
    });

    act(() => {
      result.current.triggerAttack(60, 64);
      result.current.triggerAttack(60, 100);
      result.current.triggerRelease(60);
    });

    expect(triggerAttack).toHaveBeenCalledTimes(1);
    expect(triggerAttack).toHaveBeenCalledWith("C4", undefined, 64 / 127);
    expect(triggerRelease).toHaveBeenCalledTimes(1);
    expect(triggerRelease).toHaveBeenCalledWith("C4");
  });

  it("disposes and clears the current synth when disabled", async () => {
    const { result } = renderHook(() => useToneSynth());

    await act(async () => {
      await result.current.enable();
    });

    act(() => {
      result.current.triggerAttack(61);
      result.current.disable();
      result.current.triggerRelease(61);
    });

    expect(releaseAll).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(triggerRelease).not.toHaveBeenCalled();
    expect(result.current.status).toBe("off");

    await act(async () => {
      await result.current.enable();
    });

    expect(PolySynth).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("sets error status when enabling fails", async () => {
    start.mockRejectedValueOnce(new Error("audio denied"));
    const { result } = renderHook(() => useToneSynth());

    await act(async () => {
      await result.current.enable();
    });

    expect(result.current.status).toBe("error");
    expect(PolySynth).not.toHaveBeenCalled();
  });

  it("returns the in-flight startup promise for concurrent enable calls", async () => {
    const deferred = createDeferred<void>();
    start.mockReturnValueOnce(deferred.promise);
    const { result } = renderHook(() => useToneSynth());
    let firstResolved = false;
    let secondResolved = false;
    let firstEnable!: Promise<void>;
    let secondEnable!: Promise<void>;

    act(() => {
      firstEnable = result.current.enable().then(() => {
        firstResolved = true;
      });
      secondEnable = result.current.enable().then(() => {
        secondResolved = true;
      });
    });

    await vi.waitFor(() => {
      expect(start).toHaveBeenCalledTimes(1);
    });

    expect(firstResolved).toBe(false);
    expect(secondResolved).toBe(false);
    expect(PolySynth).not.toHaveBeenCalled();

    await act(async () => {
      deferred.resolve();
      await firstEnable;
      await secondEnable;
    });

    expect(firstResolved).toBe(true);
    expect(secondResolved).toBe(true);
    expect(PolySynth).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("on");
  });

  it("tracks duplicate attacks by normalized note name", async () => {
    const { result } = renderHook(() => useToneSynth());

    await act(async () => {
      await result.current.enable();
    });

    act(() => {
      result.current.triggerAttack(60.2, 64);
      result.current.triggerAttack(60.4, 100);
      result.current.triggerRelease(60.4);
      result.current.triggerAttack(60.4, 100);
    });

    expect(triggerAttack).toHaveBeenCalledTimes(2);
    expect(triggerAttack).toHaveBeenNthCalledWith(1, "C4", undefined, 64 / 127);
    expect(triggerAttack).toHaveBeenNthCalledWith(2, "C4", undefined, 100 / 127);
    expect(triggerRelease).toHaveBeenCalledTimes(1);
    expect(triggerRelease).toHaveBeenCalledWith("C4");
  });

  it("disposes the synth on cleanup", async () => {
    const { result, unmount } = renderHook(() => useToneSynth());

    await act(async () => {
      await result.current.enable();
    });

    unmount();

    expect(releaseAll).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
