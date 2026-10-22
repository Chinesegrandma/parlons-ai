import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import Home from "../app/page";
import { api } from "../lib/api";
import type { Message } from "../lib/types";

let messages: Message[];
beforeEach(() => {
  messages = [
    {
      id: 1,
      role: "assistant",
      content: "Bonjour ! Qu’est-ce que je vous sers ?",
    },
  ];
  vi.spyOn(api, "health").mockResolvedValue({
    mode: "mock",
    speech_ready: true,
    stt_ready: true,
    mock_ai: true,
  });
  vi.spyOn(api, "session").mockImplementation(async (id, topic) => ({
    id,
    topic,
    messages,
  }));
  vi.spyOn(api, "chat").mockImplementation(async (_id, text) => {
    messages = [
      ...messages,
      { id: 2, role: "user", content: text },
      { id: 3, role: "assistant", content: "Avec plaisir !" },
    ];
    return { reply: "Avec plaisir !", correction: "", mode: "mock" };
  });
  vi.spyOn(api, "history").mockImplementation(async (id) => ({
    id,
    topic: "daily",
    messages,
  }));
  vi.spyOn(api, "synthesize").mockResolvedValue(new Blob(["mock"]));
  vi.stubGlobal(
    "Audio",
    class {
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      removeAttribute = vi.fn();
      playbackRate = 1;
    },
  );
});

it("uses speech_ready to disable playback and preserves text-only chat", async () => {
  vi.mocked(api.health).mockResolvedValue({
    mode: "mock",
    speech_ready: false,
    stt_ready: false,
    mock_ai: true,
  });
  const user = userEvent.setup();
  render(<Home />);
  expect(
    await screen.findByText("Speech unavailable · text chat available"),
  ).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Écouter" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Record French" })).toBeDisabled();
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Bonjour");
  await user.click(screen.getByRole("button", { name: "Send" }));
  expect(await screen.findByText("Avec plaisir !")).toBeInTheDocument();
  expect(api.synthesize).not.toHaveBeenCalled();
});

it("automatically plays newly generated replies", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await screen.findByText("Speech available");
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Bonjour");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() =>
    expect(api.synthesize).toHaveBeenCalledWith(
      "Avec plaisir !",
      expect.any(AbortSignal),
    ),
  );
});

it("provides a working autoplay checkbox", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await screen.findByText("Speech available");
  await user.click(screen.getByRole("checkbox", { name: "Autoplay replies" }));
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Bonjour");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText("Avec plaisir !");
  expect(api.synthesize).not.toHaveBeenCalled();
});

it("reviews and edits a recorded transcript before sending", async () => {
  const stopped = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: {
      getUserMedia: vi
        .fn()
        .mockResolvedValue({ getTracks: () => [{ stop: stopped }] }),
    },
  });
  vi.stubGlobal(
    "MediaRecorder",
    class {
      static isTypeSupported() {
        return true;
      }
      state = "inactive";
      mimeType = "audio/webm";
      ondataavailable: ((event: { data: Blob }) => void) | null = null;
      onstop: (() => void) | null = null;
      start() {
        this.state = "recording";
      }
      stop() {
        this.state = "inactive";
        this.ondataavailable?.({
          data: new Blob(["mock recording, not speech"]),
        });
        this.onstop?.();
      }
    },
  );
  vi.spyOn(api, "transcribe").mockResolvedValue({
    id: "t1",
    original_text: "Je suis aller au café.",
  });
  const user = userEvent.setup();
  render(<Home />);
  await screen.findByText("Speech available");
  await user.click(screen.getByRole("button", { name: "Record French" }));
  await user.click(
    await screen.findByRole("button", { name: "Stop recording" }),
  );
  const editor = await screen.findByRole("textbox", {
    name: "Edit transcript",
  });
  expect(editor).toHaveValue("Je suis aller au café.");
  expect(api.chat).not.toHaveBeenCalled();
  await user.clear(editor);
  await user.type(editor, "Je suis allé au café.");
  expect(screen.getByText("Je suis aller au café.")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Send" }));
  await waitFor(() =>
    expect(api.chat).toHaveBeenCalledWith(
      expect.any(String),
      "Je suis allé au café.",
      "t1",
    ),
  );
  expect(stopped).toHaveBeenCalled();
});

it("offers manual playback fallback when autoplay is blocked", async () => {
  let attempts = 0;
  vi.stubGlobal(
    "Audio",
    class {
      play = vi.fn(async () => {
        if (++attempts === 1)
          throw new DOMException("blocked", "NotAllowedError");
      });
      pause = vi.fn();
      removeAttribute = vi.fn();
      playbackRate = 1;
    },
  );
  const user = userEvent.setup();
  render(<Home />);
  await screen.findByText("Speech available");
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Bonjour");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await user.click(
    await screen.findByRole("button", { name: "Play response" }),
  );
  await waitFor(() =>
    expect(
      screen.queryByRole("button", { name: "Play response" }),
    ).not.toBeInTheDocument(),
  );
  expect(attempts).toBe(2);
  expect(api.synthesize).toHaveBeenCalledOnce();
});

it("does not send unfinished IME composition on Enter", async () => {
  render(<Home />);
  await screen.findByText("Speech available");
  const input = screen.getByRole("textbox", { name: "Message" });
  fireEvent.change(input, { target: { value: "Bonjour" } });
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });
  expect(api.chat).not.toHaveBeenCalled();
});

it("shows real-mode billing and configuration status without generating anything on load", async () => {
  vi.mocked(api.health).mockResolvedValue({
    mode: "ai",
    speech_ready: true,
    stt_ready: true,
    mock_ai: false,
  });
  render(<Home />);
  const status = await screen.findByRole("region", { name: "真实服务状态" });
  expect(status).toHaveTextContent("真实调用已开启");
  expect(status).toHaveTextContent("语音朗读：已配置");
  expect(status).toHaveTextContent("消耗 API 额度");
  expect(api.chat).not.toHaveBeenCalled();
  expect(api.synthesize).not.toHaveBeenCalled();
});
