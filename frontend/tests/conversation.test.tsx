import { StrictMode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { useConversation } from "../hooks/useConversation";
import { api } from "../lib/api";
import type { Session } from "../lib/types";

const opening = { id: 1, role: "assistant" as const, content: "Bonjour !" };
beforeEach(() => {
  vi.spyOn(api, "session").mockImplementation(async (id, topic) => ({
    id,
    topic,
    messages: [opening],
  }));
  vi.spyOn(api, "chat").mockResolvedValue({
    reply: "Très bien !",
    correction: "",
    mode: "mock",
  });
  vi.spyOn(api, "history").mockImplementation(async (id) => ({
    id,
    topic: "cafe",
    messages: [
      opening,
      { id: 2, role: "user", content: "Bonjour" },
      { id: 3, role: "assistant", content: "Très bien !" },
    ],
  }));
});

it("reuses session ID through StrictMode and page refresh", async () => {
  const first = renderHook(useConversation, { wrapper: StrictMode });
  await waitFor(() => expect(first.result.current.busy).toBe(false));
  const id = first.result.current.session!.id;
  expect(first.result.current.session!.messages).toHaveLength(1);
  first.unmount();
  const second = renderHook(useConversation);
  await waitFor(() => expect(second.result.current.busy).toBe(false));
  expect(second.result.current.session!.id).toBe(id);
  expect(
    vi.mocked(api.session).mock.calls.every(([requested]) => requested === id),
  ).toBe(true);
  expect(second.result.current.session!.messages).toHaveLength(1);
});

it("separates original and edited transcripts and never sends on transcription", async () => {
  const { result } = renderHook(useConversation);
  await waitFor(() => expect(result.current.busy).toBe(false));
  act(() =>
    result.current.acceptTranscript({
      id: "transcript-1",
      original_text: "Je suis aller.",
    }),
  );
  expect(result.current.input).toBe("Je suis aller.");
  expect(api.chat).not.toHaveBeenCalled();
  act(() => result.current.setInput("Je suis allé."));
  expect(result.current.transcript!.original_text).toBe("Je suis aller.");
  await act(async () => {
    await result.current.send();
  });
  expect(api.chat).toHaveBeenCalledWith(
    expect.any(String),
    "Je suis allé.",
    "transcript-1",
  );
  expect(result.current.input).toBe("");
  expect(result.current.transcript).toBeNull();
});

it("retains the editable draft after failed chat", async () => {
  vi.mocked(api.chat).mockRejectedValue(new Error("mock timeout"));
  const { result } = renderHook(useConversation);
  await waitFor(() => expect(result.current.busy).toBe(false));
  act(() =>
    result.current.acceptTranscript({ id: "t1", original_text: "Bonjour" }),
  );
  act(() => result.current.setInput("Bonjour !"));
  await act(async () => {
    expect(await result.current.send()).toBeNull();
  });
  expect(result.current.input).toBe("Bonjour !");
  expect(result.current.transcript!.original_text).toBe("Bonjour");
  expect(result.current.session!.messages).toHaveLength(1);
});

it("creates a different session on explicit new-session action", async () => {
  const { result } = renderHook(useConversation);
  await waitFor(() => expect(result.current.busy).toBe(false));
  const id = result.current.session!.id;
  await act(async () => {
    await result.current.start("travel");
  });
  expect(result.current.session!.id).not.toBe(id);
  expect(result.current.session!.topic).toBe("travel");
});

it("ignores a stale session response", async () => {
  let resolve!: (value: Session) => void;
  vi.mocked(api.session).mockImplementationOnce(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const { result } = renderHook(useConversation);
  await act(async () => {
    await result.current.start("cafe");
  });
  await act(async () => {
    resolve({ id: "old", topic: "daily", messages: [opening] });
  });
  expect(result.current.session!.topic).toBe("cafe");
});

it("discards transcript draft without sending", async () => {
  const { result } = renderHook(useConversation);
  await waitFor(() => expect(result.current.busy).toBe(false));
  act(() =>
    result.current.acceptTranscript({ id: "t1", original_text: "Bonjour" }),
  );
  act(() => result.current.discard());
  expect(result.current.transcript).toBeNull();
  expect(result.current.input).toBe("");
  expect(api.chat).not.toHaveBeenCalled();
});
