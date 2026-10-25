import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import Home from "../app/page";
import { api } from "../lib/api";
import { catalog } from "../lib/catalog";
import type { Message } from "../lib/types";

const detector = vi.hoisted(() => ({
  end: null as (() => void) | null,
  empty: null as (() => void) | null,
  cleanup: vi.fn(),
}));
vi.mock("../lib/silence", () => ({
  prepareSilence: vi.fn(),
  releaseSilence: vi.fn(),
  watchSilence: vi.fn((_stream, end, empty) => {
    detector.end = end;
    detector.empty = empty;
    return detector.cleanup;
  }),
}));
class MockAudio {
  static current: MockAudio;
  src = "";
  volume = 1;
  playbackRate = 1;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
  removeAttribute = vi.fn();
  constructor(src: string) {
    this.src = src;
    MockAudio.current = this;
  }
}
const trackStop = vi.fn();
class Recorder {
  static current: Recorder;
  static isTypeSupported() {
    return true;
  }
  state = "inactive";
  mimeType = "audio/webm";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor() {
    Recorder.current = this;
  }
  start() {
    this.state = "recording";
  }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({
      data: new Blob(["synthetic fixture, not real audio"]),
    });
    this.onstop?.();
  }
}
let messages: Message[];
let selectedTopic: (typeof catalog)[number]["id"];
beforeEach(() => {
  selectedTopic = "daily";
  messages = [];
  detector.end = null;
  detector.empty = null;
  trackStop.mockClear();
  detector.cleanup.mockClear();
  vi.spyOn(api, "health").mockResolvedValue({
    mode: "mock",
    speech_ready: true,
    stt_ready: true,
    mock_ai: true,
  });
  vi.spyOn(api, "session").mockImplementation(async (id, topic) => {
    selectedTopic = topic;
    messages = [
      {
        id: 1,
        role: "assistant",
        content: catalog.find((item) => item.id === topic)!.opening,
      },
    ];
    return { id, topic, messages };
  });
  vi.spyOn(api, "chat").mockImplementation(async (_id, text) => {
    messages = [
      ...messages,
      { id: messages.length + 1, role: "user", content: text },
      {
        id: messages.length + 2,
        role: "assistant",
        content: "Avec plaisir ! Et ensuite ?",
        correction: "Example correction",
      },
    ];
    return {
      reply: "Avec plaisir ! Et ensuite ?",
      correction: "Example correction",
      mode: "mock",
    };
  });
  vi.spyOn(api, "history").mockImplementation(async (id) => ({
    id,
    topic: selectedTopic,
    messages,
  }));
  vi.spyOn(api, "synthesize").mockResolvedValue(new Blob(["tone"]));
  vi.spyOn(api, "transcribe").mockResolvedValue({
    id: "t1",
    original_text: "Bonjour, je voudrais un café.",
  });
  vi.spyOn(api, "review").mockResolvedValue({
    summary: "Session review",
    strengths: [{ quote: "Bonjour", reason: "Polite greeting" }],
    corrections: [
      {
        original: "une café",
        suggestion: "un café",
        explanation: "Masculine noun",
      },
    ],
  });
  vi.stubGlobal("Audio", MockAudio);
  vi.stubGlobal("MediaRecorder", Recorder);
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi
        .fn()
        .mockResolvedValue({ getTracks: () => [{ stop: trackStop }] }),
    },
  });
});
async function enter() {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("button", { name: "直接开始聊天" }));
  await screen.findByText(catalog[0].opening);
  await waitFor(() => expect(api.synthesize).toHaveBeenCalledOnce());
  act(() => MockAudio.current.onended?.());
  return user;
}

it("does not create sessions or make billable calls on the home screen", async () => {
  render(<Home />);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent("模拟体验"),
  );
  expect(api.session).not.toHaveBeenCalled();
  expect(api.synthesize).not.toHaveBeenCalled();
  expect(screen.getByRole("button", { name: "办事" })).toBeInTheDocument();
});
it("opens category, group, then the leaf enters chat without an extra start button", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("button", { name: "办事" }));
  await user.click(screen.getByRole("button", { name: /银行.*查看具体事项/ }));
  expect(api.session).not.toHaveBeenCalled();
  await user.click(
    screen.getByRole("button", { name: /办理银行卡.*进入对话/ }),
  );
  await screen.findByRole("heading", { name: "办理银行卡" });
  expect(api.session).toHaveBeenCalledWith(expect.any(String), "bank_card");
  expect(screen.queryByText("找点灵感")).not.toBeInTheDocument();
  expect(screen.queryByText("练习工具")).not.toBeInTheDocument();
});
it("autoplays the opening once, and then autoplays generated replies", async () => {
  const user = await enter();
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Bonjour");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText("Avec plaisir ! Et ensuite ?");
  expect(api.synthesize).toHaveBeenCalledTimes(2);
});
it("preserves text-only practice without speech configuration", async () => {
  vi.mocked(api.health).mockResolvedValue({
    mode: "mock",
    speech_ready: false,
    stt_ready: false,
    mock_ai: true,
  });
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("button", { name: "直接开始聊天" }));
  await screen.findByText(catalog[0].opening);
  expect(screen.getByRole("button", { name: "Record French" })).toBeDisabled();
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Bonjour");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText("Avec plaisir ! Et ensuite ?");
  expect(api.synthesize).not.toHaveBeenCalled();
});
it("uses the chosen language for the UI and new feedback", async () => {
  const user = await enter();
  await user.click(screen.getByRole("button", { name: "设置" }));
  await user.selectOptions(
    screen.getByRole("combobox", { name: "语言" }),
    "en",
  );
  expect(screen.getByText("Practice preferences")).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Free chat" }),
  ).toBeInTheDocument();
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Bonjour");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() =>
    expect(api.chat).toHaveBeenCalledWith(
      expect.any(String),
      "Bonjour",
      undefined,
      { language: "en", practice_mode: "guided" },
    ),
  );
  expect(localStorage.getItem("parlons-language")).toBe("en");
  expect(document.querySelector(".conversation-page")?.textContent).not.toMatch(
    /[\u4e00-\u9fff]/,
  );
});
it("reviews an editable transcript in guided mode instead of auto-sending", async () => {
  const user = await enter();
  await user.click(screen.getByRole("button", { name: "Record French" }));
  await user.click(screen.getByRole("button", { name: "Stop recording" }));
  const input = await screen.findByRole("textbox", { name: "Edit transcript" });
  expect(api.chat).not.toHaveBeenCalled();
  await user.clear(input);
  await user.type(input, "Je voudrais un thé.");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() =>
    expect(api.chat).toHaveBeenCalledWith(
      expect.any(String),
      "Je voudrais un thé.",
      "t1",
      { language: "zh", practice_mode: "guided" },
    ),
  );
});
it("does not send during IME composition", async () => {
  await enter();
  const input = screen.getByRole("textbox", { name: "Message" });
  fireEvent.change(input, { target: { value: "Bonjour" } });
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });
  expect(api.chat).not.toHaveBeenCalled();
});
it("supports opening autoplay opt-out", async () => {
  localStorage.setItem("parlons-autoplay", "false");
  const user = userEvent.setup();
  render(<Home />);
  await user.click(screen.getByRole("button", { name: "直接开始聊天" }));
  await screen.findByText(catalog[0].opening);
  expect(api.synthesize).not.toHaveBeenCalled();
});
it("hands-free mode sends after silence, waits for playback end, then listens again", async () => {
  const user = await enter();
  await user.click(screen.getByRole("button", { name: "连续对话" }));
  await user.click(screen.getByRole("button", { name: "开启连续对话" }));
  await waitFor(() => expect(Recorder.current.state).toBe("recording"));
  act(() => detector.end?.());
  await waitFor(() =>
    expect(api.chat).toHaveBeenCalledWith(
      expect.any(String),
      "Bonjour, je voudrais un café.",
      "t1",
      { language: "zh", practice_mode: "conversation" },
    ),
  );
  await screen.findByText("Avec plaisir ! Et ensuite ?");
  expect(Recorder.current.state).toBe("inactive");
  expect(trackStop).toHaveBeenCalled();
  expect(screen.queryByText("Example correction")).not.toBeInTheDocument();
  act(() => MockAudio.current.onended?.());
  await waitFor(() => expect(Recorder.current.state).toBe("recording"));
  await user.click(screen.getByRole("button", { name: "暂停" }));
  expect(Recorder.current.state).toBe("inactive");
  expect(api.transcribe).toHaveBeenCalledOnce();
});
it("pausing during a pending reply never restarts the microphone or audio", async () => {
  let resolve: (value: {
    reply: string;
    correction: string;
    mode: string;
  }) => void = () => {};
  vi.mocked(api.chat).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const user = await enter();
  await user.click(screen.getByRole("button", { name: "连续对话" }));
  await user.click(screen.getByRole("button", { name: "开启连续对话" }));
  await waitFor(() => expect(Recorder.current.state).toBe("recording"));
  act(() => detector.end?.());
  await waitFor(() => expect(api.chat).toHaveBeenCalledOnce());
  await user.click(screen.getByRole("button", { name: "暂停" }));
  await act(async () =>
    resolve({ reply: "Late reply", correction: "", mode: "mock" }),
  );
  expect(api.synthesize).toHaveBeenCalledOnce();
  expect(Recorder.current.state).toBe("inactive");
});
it("mode switching stops capture and does not submit partial audio", async () => {
  const user = await enter();
  await user.click(screen.getByRole("button", { name: "连续对话" }));
  await user.click(screen.getByRole("button", { name: "开启连续对话" }));
  await waitFor(() => expect(Recorder.current.state).toBe("recording"));
  await user.click(screen.getByRole("button", { name: "逐句练习" }));
  expect(Recorder.current.state).toBe("inactive");
  expect(api.transcribe).not.toHaveBeenCalled();
});
it("ends with strengths and corrections together", async () => {
  const user = await enter();
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Bonjour");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText("Avec plaisir ! Et ensuite ?");
  await user.click(screen.getByRole("button", { name: "结束并总结" }));
  expect(await screen.findByText("Polite greeting")).toBeInTheDocument();
  expect(screen.getByText("Masculine noun")).toBeInTheDocument();
  expect(api.review).toHaveBeenCalledWith(
    expect.any(String),
    "zh",
    expect.any(AbortSignal),
  );
});

it("hiding the page stops capture without submitting the unfinished turn", async () => {
  const user = await enter();
  await user.click(screen.getByRole("button", { name: "连续对话" }));
  await user.click(screen.getByRole("button", { name: "开启连续对话" }));
  await waitFor(() => expect(Recorder.current.state).toBe("recording"));
  vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  expect(Recorder.current.state).toBe("inactive");
  expect(api.transcribe).not.toHaveBeenCalled();
});

it("silence timeout pauses without invoking paid provider operations", async () => {
  const user = await enter();
  await user.click(screen.getByRole("button", { name: "连续对话" }));
  await user.click(screen.getByRole("button", { name: "开启连续对话" }));
  await waitFor(() => expect(Recorder.current.state).toBe("recording"));
  act(() => detector.empty?.());
  expect(Recorder.current.state).toBe("inactive");
  expect(api.transcribe).not.toHaveBeenCalled();
  expect(api.chat).not.toHaveBeenCalled();
});

it("a failed automated reply stops the loop and retains the transcript draft", async () => {
  vi.mocked(api.chat).mockRejectedValueOnce(new Error("failure"));
  const user = await enter();
  await user.click(screen.getByRole("button", { name: "连续对话" }));
  await user.click(screen.getByRole("button", { name: "开启连续对话" }));
  await waitFor(() => expect(Recorder.current.state).toBe("recording"));
  act(() => detector.end?.());
  const draft = await screen.findByRole("textbox", { name: "Edit transcript" });
  expect(draft).toHaveValue("Bonjour, je voudrais un café.");
  expect(api.chat).toHaveBeenCalledOnce();
  expect(api.synthesize).toHaveBeenCalledOnce();
  expect(Recorder.current.state).toBe("inactive");
});
