export type Topic = "daily" | "interview" | "travel" | "cafe";
export type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  correction?: string | null;
  original_transcript?: string | null;
  edited_transcript?: string | null;
};
export type Session = { id: string; topic: Topic; messages: Message[] };
export type Health = {
  mode: "mock" | "demo" | "ai";
  speech_ready: boolean;
  stt_ready: boolean;
  mock_ai: boolean;
  private_site?: boolean;
};
export type Transcript = { id: string; original_text: string };
export const topics: { id: Topic; name: string; emoji: string }[] = [
  { id: "daily", name: "Vie quotidienne", emoji: "☀️" },
  { id: "interview", name: "Entretien", emoji: "💼" },
  { id: "travel", name: "Voyage", emoji: "✈️" },
  { id: "cafe", name: "Au café", emoji: "☕" },
];
