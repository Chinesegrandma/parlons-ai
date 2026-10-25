import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { prepareSilence, releaseSilence, watchSilence } from "../lib/silence";
let now = 0,
  amplitude = 0;
let next: FrameRequestCallback | null = null;
const disconnect = vi.fn(),
  close = vi.fn().mockResolvedValue(undefined);
class Context {
  state = "running";
  resume = vi.fn().mockResolvedValue(undefined);
  close = close;
  createAnalyser() {
    return {
      fftSize: 1024,
      getFloatTimeDomainData: (data: Float32Array) => data.fill(amplitude),
    };
  }
  createMediaStreamSource() {
    return { connect: vi.fn(), disconnect };
  }
}
function tick(time: number, value: number) {
  now = time;
  amplitude = value;
  const callback = next;
  next = null;
  callback?.(time);
}
beforeEach(() => {
  now = 0;
  amplitude = 0;
  next = null;
  disconnect.mockClear();
  close.mockClear();
  close.mockResolvedValue(undefined);
  vi.stubGlobal("AudioContext", Context);
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => {
      next = callback;
      return 1;
    }),
  );
  vi.stubGlobal(
    "cancelAnimationFrame",
    vi.fn(() => {
      next = null;
    }),
  );
});
afterEach(() => releaseSilence());
it("waits for actual speech and a sustained pause instead of uploading ambient silence", () => {
  const end = vi.fn(),
    empty = vi.fn();
  prepareSilence();
  const stop = watchSilence({} as MediaStream, end, empty);
  tick(1000, 0);
  expect(end).not.toHaveBeenCalled();
  tick(1100, 0.03);
  tick(1200, 0.03);
  tick(1300, 0.03);
  tick(2400, 0);
  expect(end).not.toHaveBeenCalled();
  tick(2700, 0);
  expect(end).toHaveBeenCalledOnce();
  expect(empty).not.toHaveBeenCalled();
  stop();
  expect(disconnect).toHaveBeenCalledOnce();
});
it("times out without speech and closes detector resources on release", () => {
  const end = vi.fn(),
    empty = vi.fn();
  watchSilence({} as MediaStream, end, empty);
  tick(12000, 0);
  expect(empty).toHaveBeenCalledOnce();
  expect(end).not.toHaveBeenCalled();
  releaseSilence();
  expect(close).toHaveBeenCalledOnce();
});
it("cancellation cannot emit a late end-of-turn", () => {
  const end = vi.fn(),
    empty = vi.fn();
  const stop = watchSilence({} as MediaStream, end, empty);
  stop();
  tick(13000, 0);
  expect(end).not.toHaveBeenCalled();
  expect(empty).not.toHaveBeenCalled();
});
