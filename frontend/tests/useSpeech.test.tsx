import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSpeech } from "../hooks/useSpeech";
import { api } from "../lib/api";

class MockAudio {
  static instances: MockAudio[] = [];
  playbackRate = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  removeAttribute = vi.fn();
  constructor(public src: string) {
    MockAudio.instances.push(this);
  }
}
beforeEach(() => {
  MockAudio.instances = [];
  vi.stubGlobal("Audio", MockAudio);
  vi.spyOn(api, "synthesize").mockResolvedValue(
    new Blob(["mock audio"], { type: "audio/wav" }),
  );
});

describe("speech playback", () => {
  it("autoplays generated replies when ready", async () => {
    const { result } = renderHook(useSpeech);
    await act(async () => {
      await result.current.playResponse("Bonjour", true);
    });
    expect(api.synthesize).toHaveBeenCalledOnce();
    expect(MockAudio.instances[0].play).toHaveBeenCalledOnce();
  });
  it("does not request audio when autoplay is disabled", async () => {
    const { result } = renderHook(useSpeech);
    act(() => result.current.toggleAutoplay(false));
    await act(async () => {
      await result.current.playResponse("Bonjour", true);
    });
    expect(api.synthesize).not.toHaveBeenCalled();
    expect(localStorage.getItem("parlons-autoplay")).toBe("false");
  });
  it("loads saved autoplay preference", async () => {
    localStorage.setItem("parlons-autoplay", "false");
    const { result } = renderHook(useSpeech);
    await act(async () => {
      await result.current.playResponse("Bonjour", true);
    });
    expect(api.synthesize).not.toHaveBeenCalled();
  });
  it("keeps text-only mode free of synthesis requests", async () => {
    const { result } = renderHook(useSpeech);
    await act(async () => {
      await result.current.playResponse("Bonjour", false);
    });
    expect(api.synthesize).not.toHaveBeenCalled();
  });
  it("supports 0.8x and changing the rate during playback", async () => {
    const { result } = renderHook(useSpeech);
    act(() => result.current.toggleSlow(true));
    await act(async () => {
      await result.current.speak("Bonjour");
    });
    expect(MockAudio.instances[0].playbackRate).toBe(0.8);
    act(() => result.current.toggleSlow(false));
    expect(MockAudio.instances[0].playbackRate).toBe(1);
  });
  it("offers manual retry after browser rejection without another API request", async () => {
    vi.stubGlobal(
      "Audio",
      class extends MockAudio {
        constructor(src: string) {
          super(src);
          this.play.mockRejectedValueOnce(
            new DOMException("Gesture required", "NotAllowedError"),
          );
        }
      },
    );
    const { result } = renderHook(useSpeech);
    await act(async () => {
      await result.current.speak("Bonjour");
    });
    expect(result.current.blocked).toBe(true);
    expect(result.current.notice).toContain("Click Play response");
    await act(async () => {
      await result.current.retry();
    });
    expect(result.current.blocked).toBe(false);
    expect(MockAudio.instances[0].play).toHaveBeenCalledTimes(2);
    expect(api.synthesize).toHaveBeenCalledOnce();
  });
  it("pauses and releases old audio before playing a new response", async () => {
    const { result } = renderHook(useSpeech);
    await act(async () => {
      await result.current.speak("Un");
    });
    const old = MockAudio.instances[0];
    await act(async () => {
      await result.current.speak("Deux");
    });
    expect(old.pause).toHaveBeenCalledOnce();
    expect(old.removeAttribute).toHaveBeenCalledWith("src");
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    expect(MockAudio.instances[1].play).toHaveBeenCalledOnce();
  });
  it("ignores out-of-order synthesis results", async () => {
    let resolveFirst!: (blob: Blob) => void;
    vi.mocked(api.synthesize).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveFirst = resolve;
        }),
    );
    const { result } = renderHook(useSpeech);
    let first!: Promise<boolean>;
    act(() => {
      first = result.current.speak("Old");
    });
    await act(async () => {
      await result.current.speak("New");
    });
    await act(async () => {
      resolveFirst(new Blob(["old"]));
      await first;
    });
    expect(MockAudio.instances).toHaveLength(1);
  });
  it("handles synthesis failures with text fallback", async () => {
    vi.mocked(api.synthesize).mockRejectedValue(new Error("mock failure"));
    const { result } = renderHook(useSpeech);
    await act(async () => {
      await result.current.speak("Bonjour");
    });
    expect(result.current.notice).toContain("text chat is available");
    expect(result.current.blocked).toBe(false);
  });
  it("handles audio decode failures and releases the URL", async () => {
    const { result } = renderHook(useSpeech);
    await act(async () => {
      await result.current.speak("Bonjour");
    });
    act(() => MockAudio.instances[0].onerror?.());
    expect(result.current.notice).toContain("Audio failed");
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
  it("cleans up playback on unmount", async () => {
    const { result, unmount } = renderHook(useSpeech);
    await act(async () => {
      await result.current.speak("Bonjour");
    });
    unmount();
    expect(MockAudio.instances[0].pause).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});

it("honors autoplay being disabled while a chat response is pending", async () => {
  const { result } = renderHook(useSpeech);
  const pendingResponseCallback = result.current.playResponse;
  act(() => result.current.toggleAutoplay(false));
  await act(async () => {
    await pendingResponseCallback("Late response", true);
  });
  expect(api.synthesize).not.toHaveBeenCalled();
});

it("waits for playback completion in hands-free mode and settles cancellation", async () => {
  const { result } = renderHook(useSpeech);
  let finished = false;
  let playing!: Promise<boolean>;
  await act(async () => {
    playing = result.current.speakAndWait("Bonjour");
    playing.then(() => {
      finished = true;
    });
  });
  expect(finished).toBe(false);
  expect(result.current.working).toBe(true);
  act(() => MockAudio.instances[0].onended?.());
  await expect(playing).resolves.toBe(true);
  expect(result.current.working).toBe(false);
  await act(async () => {
    playing = result.current.speakAndWait("Encore");
  });
  act(() => result.current.stop());
  await expect(playing).resolves.toBe(false);
});

it("settles hands-free playback when autoplay is blocked and retries without a second request", async () => {
  vi.stubGlobal(
    "Audio",
    class extends MockAudio {
      constructor(src: string) {
        super(src);
        this.play.mockRejectedValueOnce(
          new DOMException("blocked", "NotAllowedError"),
        );
      }
    },
  );
  const { result } = renderHook(useSpeech);
  await act(async () => {
    expect(await result.current.speakAndWait("Bonjour")).toBe(false);
  });
  expect(result.current.blocked).toBe(true);
  await act(async () => {
    await result.current.retry();
  });
  expect(result.current.working).toBe(true);
  expect(api.synthesize).toHaveBeenCalledOnce();
  act(() => MockAudio.instances[0].onended?.());
  expect(result.current.working).toBe(false);
});
