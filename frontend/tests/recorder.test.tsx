import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { useRecorder } from "../hooks/useRecorder";
import { api } from "../lib/api";

const trackStop = vi.fn();
class MockRecorder {
  static current: MockRecorder;
  static isTypeSupported() {
    return true;
  }
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    MockRecorder.current = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["mock recording, not audio evaluation data"]),
    });
    this.onstop?.();
  }
}
beforeEach(() => {
  trackStop.mockReset();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi
        .fn()
        .mockResolvedValue({ getTracks: () => [{ stop: trackStop }] }),
    },
  });
  vi.stubGlobal("MediaRecorder", MockRecorder);
  vi.spyOn(api, "transcribe").mockResolvedValue({
    id: "t1",
    original_text: "Bonjour",
  });
});
afterEach(() => {
  vi.useRealTimers();
});

it("stops microphone tracks after transcription failure and retains text input usability", async () => {
  vi.mocked(api.transcribe).mockRejectedValue(new Error("mock failure"));
  const onTranscript = vi.fn();
  const onError = vi.fn();
  const { result } = renderHook(() => useRecorder(onTranscript, onError));
  await act(async () => {
    await result.current.toggle("session");
  });
  await act(async () => {
    await result.current.toggle("session");
  });
  expect(trackStop).toHaveBeenCalled();
  expect(onError).toHaveBeenCalledWith(
    expect.stringContaining("Transcription failed"),
  );
  expect(onTranscript).not.toHaveBeenCalled();
  expect(result.current.transcribing).toBe(false);
});

it("releases the microphone without uploading on unmount", async () => {
  const { result, unmount } = renderHook(() => useRecorder(vi.fn(), vi.fn()));
  await act(async () => {
    await result.current.toggle("session");
  });
  unmount();
  expect(trackStop).toHaveBeenCalled();
  expect(api.transcribe).not.toHaveBeenCalled();
});

it("ignores cancelled transcription results", async () => {
  let complete!: (value: { id: string; original_text: string }) => void;
  vi.mocked(api.transcribe).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  );
  const onTranscript = vi.fn();
  const { result } = renderHook(() => useRecorder(onTranscript, vi.fn()));
  await act(async () => {
    await result.current.toggle("session");
  });
  await act(async () => {
    await result.current.toggle("session");
  });
  await waitFor(() => expect(api.transcribe).toHaveBeenCalledOnce());
  const signal = vi.mocked(api.transcribe).mock.calls[0][2];
  act(() => result.current.cancel());
  expect(signal.aborted).toBe(true);
  await act(async () => {
    complete({ id: "late", original_text: "Stale" });
  });
  expect(onTranscript).not.toHaveBeenCalled();
});

it("reports denied microphone permission without uploading", async () => {
  vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
    new DOMException("denied", "NotAllowedError"),
  );
  const onError = vi.fn();
  const { result } = renderHook(() => useRecorder(vi.fn(), onError));
  await act(async () => {
    await result.current.toggle("session");
  });
  expect(onError).toHaveBeenCalledWith(
    expect.stringContaining("microphone permission"),
  );
  expect(result.current.listening).toBe(false);
  expect(api.transcribe).not.toHaveBeenCalled();
});

it("stops recording automatically after sixty seconds", async () => {
  vi.useFakeTimers();
  const onTranscript = vi.fn();
  const { result } = renderHook(() => useRecorder(onTranscript, vi.fn()));
  await act(async () => {
    await result.current.toggle("session");
  });
  expect(result.current.listening).toBe(true);
  await act(async () => {
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(result.current.listening).toBe(false);
  expect(trackStop).toHaveBeenCalled();
  expect(onTranscript).toHaveBeenCalledWith({
    id: "t1",
    original_text: "Bonjour",
  });
});

it("rejects oversized recordings without uploading", async () => {
  const onError = vi.fn();
  const { result } = renderHook(() => useRecorder(vi.fn(), onError));
  await act(async () => {
    await result.current.toggle("session");
  });
  act(() => {
    MockRecorder.current.ondataavailable?.({
      data: new Blob([new Uint8Array(8 * 1024 * 1024 + 1)]),
    });
  });
  expect(onError).toHaveBeenCalledWith(expect.stringContaining("too large"));
  expect(api.transcribe).not.toHaveBeenCalled();
  expect(trackStop).toHaveBeenCalled();
});

it("ignores a second stop tap while the browser has not delivered its stop event", async () => {
  const received = vi.fn();
  const { result } = renderHook(() => useRecorder(received, vi.fn()));
  await act(async () => {
    await result.current.toggle("session");
  });
  const recorder = MockRecorder.current;
  const stop = vi.spyOn(recorder, "stop").mockImplementation(() => {
    if (recorder.state === "inactive")
      throw new DOMException("Already stopped", "InvalidStateError");
    recorder.state = "inactive";
  });
  await act(async () => {
    await result.current.toggle("session");
    await result.current.toggle("session");
  });
  expect(stop).toHaveBeenCalledOnce();
  await act(async () => {
    recorder.ondataavailable?.({ data: new Blob(["mock recording"]) });
    recorder.onstop?.();
  });
  await waitFor(() => expect(received).toHaveBeenCalledOnce());
  expect(api.transcribe).toHaveBeenCalledOnce();
});
