export type Topic =
  | "daily"
  | "interview"
  | "travel"
  | "cafe"
  | "restaurant"
  | "shopping"
  | "doctor"
  | "friends";
export type Message = {
  id: number;
  role: "user" | "assistant";
  content: string;
  correction?: string | null;
  corrected_text?: string | null;
  review_prompt?: string | null;
  original_transcript?: string | null;
  edited_transcript?: string | null;
};
export type Session = {
  id: string;
  topic: Topic;
  messages: Message[];
  options?: PracticeOptions;
};
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
  { id: "restaurant", name: "Au restaurant", emoji: "🍽️" },
  { id: "shopping", name: "Les boutiques", emoji: "🛍️" },
  { id: "doctor", name: "Un rendez-vous", emoji: "📅" },
  { id: "friends", name: "Entre amis", emoji: "🌿" },
];

export type PracticeOptions = {
  scene: string;
  situation: string;
  goals: string[];
  level: "A1-A2" | "B1-B2" | "C1";
  focus: "fluency" | "grammar" | "natural";
  persona: "patient" | "realistic" | "challenging";
  feedback: "each_turn" | "after_session";
  explanation_language: "Chinese" | "English" | "French";
  review_targets: string[];
};
export type Voice = { id: string; name: string };
