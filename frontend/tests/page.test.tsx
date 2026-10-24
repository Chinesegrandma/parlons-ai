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
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Start speaking" }),
    ).toBeEnabled(),
  );
  await userEvent.click(screen.getByRole("button", { name: "Start speaking" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument(),
  );
  expect(
    await screen.findByText("Speech unavailable · text chat available"),
  ).toBeInTheDocument();
  for (const button of screen.getAllByRole("button", { name: "Écouter" }))
    expect(button).toBeDisabled();
  expect(screen.getByRole("button", { name: "Record French" })).toBeDisabled();
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Bonjour");
  await user.click(screen.getByRole("button", { name: "Send" }));
  expect(
    await screen.findByRole("heading", { name: "Avec plaisir !" }),
  ).toBeInTheDocument();
  expect(api.synthesize).not.toHaveBeenCalled();
});

it("automatically plays newly generated replies", async () => {
  const user = userEvent.setup();
  render(<Home />);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Start speaking" }),
    ).toBeEnabled(),
  );
  await userEvent.click(screen.getByRole("button", { name: "Start speaking" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument(),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Record French" })).toBeEnabled(),
  );
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
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Start speaking" }),
    ).toBeEnabled(),
  );
  await userEvent.click(screen.getByRole("button", { name: "Start speaking" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument(),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Record French" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "Settings" }));
  await user.click(screen.getByRole("checkbox", { name: "Autoplay replies" }));
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Bonjour");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByRole("heading", { name: "Avec plaisir !" });
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
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Start speaking" }),
    ).toBeEnabled(),
  );
  await userEvent.click(screen.getByRole("button", { name: "Start speaking" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument(),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Record French" })).toBeEnabled(),
  );
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
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Start speaking" }),
    ).toBeEnabled(),
  );
  await userEvent.click(screen.getByRole("button", { name: "Start speaking" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument(),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Record French" })).toBeEnabled(),
  );
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
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Start speaking" }),
    ).toBeEnabled(),
  );
  await userEvent.click(screen.getByRole("button", { name: "Start speaking" }));
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Send" })).toBeInTheDocument(),
  );
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Record French" })).toBeEnabled(),
  );
  const input = screen.getByRole("textbox", { name: "Message" });
  fireEvent.change(input, { target: { value: "Bonjour" } });
  fireEvent.keyDown(input, { key: "Enter", isComposing: true });
  expect(api.chat).not.toHaveBeenCalled();
});

it("keeps provider actions idle on the landing page", async () => {
  render(<Home />);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Start speaking" }),
    ).toBeEnabled(),
  );
  expect(
    screen.getByRole("heading", { name: "Un café et on parle ?" }),
  ).toBeInTheDocument();
  expect(api.chat).not.toHaveBeenCalled();
  expect(api.synthesize).not.toHaveBeenCalled();
});
