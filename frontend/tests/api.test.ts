import { expect, it, vi } from "vitest";
import { api } from "../lib/api";

it("uses the same-origin backend path for health and chat", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ mode: "mock" }), { status: 200 }),
  );
  await api.health();
  expect(fetch).toHaveBeenCalledWith("/api/backend/health", undefined);
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(
      JSON.stringify({ reply: "Bonjour", correction: "", mode: "mock" }),
      { status: 200 },
    ),
  );
  await api.chat("session-1", "Bonjour", "transcript-1");
  expect(fetch).toHaveBeenLastCalledWith(
    "/api/backend/chat",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({
        session_id: "session-1",
        message: "Bonjour",
        transcript_id: "transcript-1",
      }),
    }),
  );
});

it("sends an editable transcript recording through the same-origin proxy", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(JSON.stringify({ id: "t1", original_text: "Bonjour" }), {
      status: 200,
    }),
  );
  const signal = new AbortController().signal;
  await api.transcribe(
    "session-1",
    new Blob(["mock audio"], { type: "audio/webm" }),
    signal,
  );
  const [url, options] = vi.mocked(fetch).mock.calls[0];
  expect(url).toBe("/api/backend/speech/transcribe");
  expect(options?.signal).toBe(signal);
  expect((options?.body as FormData).get("session_id")).toBe("session-1");
});

it("preserves safe backend diagnostics for failed chat calls", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response(
      JSON.stringify({
        detail: "OpenAI [authentication HTTP 401]：密钥认证失败。",
      }),
      { status: 502 },
    ),
  );
  await expect(api.chat("session-1", "Bonjour")).rejects.toThrow(
    "authentication HTTP 401",
  );
});

it("does not display HTML proxy error pages", async () => {
  vi.mocked(fetch).mockResolvedValueOnce(
    new Response("<html>proxy failure</html>", { status: 502 }),
  );
  await expect(api.health()).rejects.toThrow("Request failed (502)");
});
