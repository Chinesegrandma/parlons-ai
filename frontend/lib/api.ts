import type {
  LookupResult,
  Health,
  Session,
  Topic,
  Transcript,
  Language,
  PracticeMode,
  Review,
  PracticeOptions,
  Voice,
  RewriteStyle,
  RewriteSuggestion,
} from "./types";

export class ApiError extends Error {}
async function failure(response: Response): Promise<ApiError> {
  let detail = `Request failed (${response.status})`;
  try {
    const body: unknown = await response.json();
    if (
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      typeof body.detail === "string" &&
      body.detail.length <= 500
    )
      detail = body.detail;
  } catch {
    /* Non-JSON proxy errors use the HTTP status fallback. */
  }
  return new ApiError(detail);
}

const API = process.env.NEXT_PUBLIC_API_URL || "/api/backend";
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, init);
  if (!response.ok) throw await failure(response);
  return response.json() as Promise<T>;
}
const json = (body: unknown): RequestInit => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
export const api = {
  health: () => request<Health>("/health"),
  session: (id: string, topic: Topic, options?: PracticeOptions) =>
    request<Session>("/sessions", json({ id, topic, options })),
  voices: () => request<{ voices: Voice[] }>("/voices"),
  history: (id: string) => request<Session>(`/sessions/${id}`),
  chat: (
    session_id: string,
    message: string,
    transcript_id?: string,
    preferences?: { language: Language; practice_mode: PracticeMode },
  ) =>
    request<{ reply: string; correction: string; mode: string }>(
      "/chat",
      json({ session_id, message, transcript_id, ...preferences }),
    ),
  lookup: (text: string, context: string, language: Language) =>
    request<LookupResult>("/lookup", json({ text, context, language })),
  rewrite: (text: string, style: RewriteStyle, language: Language) =>
    request<RewriteSuggestion>("/rewrite", json({ text, style, language })),
  translate: (text: string, language: Language, signal?: AbortSignal) =>
    request<{ translation: string }>("/translate", {
      ...json({ text, language }),
      signal,
    }),
  review: (id: string, language: Language, signal?: AbortSignal) =>
    request<Review>(`/sessions/${id}/review`, {
      ...json({ language }),
      signal,
    }),
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
  synthesize: async (text: string, signal: AbortSignal, voice = "default") => {
    const response = await fetch(`${API}/speech/synthesize`, {
      ...json({ text, voice }),
      signal,
    });
    if (!response.ok) throw await failure(response);
    return response.blob();
  },
};
