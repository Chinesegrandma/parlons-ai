import type { Health, Session, Topic, Transcript } from "./types";

const API = process.env.NEXT_PUBLIC_API_URL || "/api/backend";
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, init);
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return response.json() as Promise<T>;
}
const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
export const api = {
  health: () => request<Health>("/health"),
  session: (id: string, topic: Topic) =>
    request<Session>("/sessions", json({ id, topic })),
  history: (id: string) => request<Session>(`/sessions/${id}`),
  chat: (session_id: string, message: string, transcript_id?: string) =>
    request<{ reply: string; correction: string; mode: string }>(
      "/chat",
      json({ session_id, message, transcript_id }),
    ),
  transcribe: (sessionId: string, audio: Blob, signal: AbortSignal) => {
    const form = new FormData();
    form.append("session_id", sessionId);
    form.append(
      "file",
      audio,
      audio.type.includes("mp4") ? "recording.m4a" : "recording.webm",
    );
    return request<Transcript>("/speech/transcribe", {
      method: "POST",
      body: form,
      signal,
    });
  },
  synthesize: async (text: string, signal: AbortSignal) => {
    const response = await fetch(`${API}/speech/synthesize`, {
      ...json({ text }),
      signal,
    });
    if (!response.ok) throw new Error("Speech synthesis unavailable");
    return response.blob();
  },
};
