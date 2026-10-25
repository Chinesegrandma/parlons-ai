import { catalog } from "./catalog";
export type Topic = (typeof catalog)[number]["id"];
export type Language = "zh" | "en";
export type PracticeMode = "guided" | "conversation";
export type Review = {
  summary: string;
  strengths: { quote: string; reason: string }[];
  corrections: { original: string; suggestion: string; explanation: string }[];
};
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
export const topics = catalog.map((scene) => ({
  id: scene.id,
  name: scene.en,
  emoji: "✦",
}));
