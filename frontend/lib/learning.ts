import type { PracticeOptions, Session, Topic } from "./types";
export const defaults: PracticeOptions = {
  scene: "",
  situation: "",
  goals: [],
  level: "B1-B2",
  focus: "natural",
  persona: "patient",
  feedback: "each_turn",
  explanation_language: "Chinese",
  review_targets: [],
};
export type Lesson = {
  id: string;
  category: "Work" | "Everyday" | "Travel";
  topic: Topic;
  title: string;
  french: string;
  situation: string;
  goals: string[];
  minutes: number;
};
export const lessons: Lesson[] = [
  {
    id: "first-day",
    category: "Work",
    topic: "interview",
    title: "Your first day",
    french: "Enchanté, moi c’est…",
    situation:
      "Premier jour dans une entreprise. Tu es un collègue qui accueille la nouvelle recrue.",
    goals: [
      "Introduce yourself",
      "Ask about the team",
      "Confirm your first task",
    ],
    minutes: 5,
  },
  {
    id: "presentation",
    category: "Work",
    topic: "interview",
    title: "Your first presentation",
    french: "Aujourd’hui, je vous présente…",
    situation:
      "Une présentation de projet à une collègue. Écoute puis pose une question précise.",
    goals: [
      "Explain your project",
      "Describe why it matters",
      "Answer a follow-up",
    ],
    minutes: 7,
  },
  {
    id: "project-update",
    category: "Work",
    topic: "interview",
    title: "A project update",
    french: "Voilà où nous en sommes.",
    situation:
      "Tu es le responsable de projet. Demande un point d’avancement, un obstacle et les prochaines étapes.",
    goals: ["Share progress", "Explain one obstacle", "Agree on the next step"],
    minutes: 5,
  },
  {
    id: "lunch",
    category: "Work",
    topic: "friends",
    title: "Lunch with colleagues",
    french: "On déjeune ensemble ?",
    situation:
      "Tu es un collègue à la pause déjeuner. Discute du repas puis des projets du week-end.",
    goals: [
      "Join the conversation",
      "Ask a follow-up",
      "Suggest lunch next week",
    ],
    minutes: 5,
  },
  {
    id: "clarify",
    category: "Work",
    topic: "interview",
    title: "Could you repeat that?",
    french: "Si j’ai bien compris…",
    situation:
      "Tu es un collègue qui explique une tâche. L’apprenant s’entraîne à demander une précision puis à reformuler.",
    goals: [
      "Ask for clarification",
      "Rephrase the request",
      "Confirm the deadline",
    ],
    minutes: 4,
  },
  {
    id: "disagree",
    category: "Work",
    topic: "interview",
    title: "Disagree, politely",
    french: "Je vois les choses autrement.",
    situation:
      "En réunion, propose une solution puis laisse l’apprenant exprimer un désaccord et une alternative.",
    goals: [
      "Acknowledge the idea",
      "Explain a concern",
      "Suggest an alternative",
    ],
    minutes: 6,
  },
  {
    id: "coffee",
    category: "Everyday",
    topic: "cafe",
    title: "Your usual coffee",
    french: "Un café, s’il vous plaît.",
    situation:
      "Tu es un serveur dans un café à Paris. Prends une commande et demande sur place ou à emporter.",
    goals: [
      "Order a drink",
      "Ask about a pastry",
      "Choose takeaway or a table",
    ],
    minutes: 3,
  },
  {
    id: "appointment",
    category: "Everyday",
    topic: "doctor",
    title: "Make an appointment",
    french: "Vous avez un créneau ?",
    situation:
      "Tu es secrétaire. Organise un rendez-vous, sans conseil médical.",
    goals: ["Explain your request", "Find a time", "Confirm the details"],
    minutes: 4,
  },
  {
    id: "dinner",
    category: "Everyday",
    topic: "restaurant",
    title: "Dinner for two",
    french: "Une table pour deux.",
    situation:
      "Tu es serveur. Aide à choisir un plat et explique les ingrédients.",
    goals: ["Request a table", "Ask about ingredients", "Ask for the bill"],
    minutes: 5,
  },
  {
    id: "return",
    category: "Everyday",
    topic: "shopping",
    title: "Return a purchase",
    french: "Je voudrais l’échanger.",
    situation:
      "Tu es vendeur. Un client souhaite échanger un vêtement acheté hier.",
    goals: [
      "Explain the problem",
      "Request an exchange",
      "Check the conditions",
    ],
    minutes: 5,
  },
  {
    id: "train",
    category: "Travel",
    topic: "travel",
    title: "Catch your train",
    french: "C’est quel quai ?",
    situation: "Tu travailles à la gare. Aide à trouver un train et son quai.",
    goals: [
      "Ask about departure",
      "Confirm the platform",
      "Check for a connection",
    ],
    minutes: 4,
  },
  {
    id: "hotel",
    category: "Travel",
    topic: "travel",
    title: "Check in, settle in",
    french: "J’ai une réservation.",
    situation:
      "Tu es réceptionniste dans un hôtel. Accueille le client et explique le petit-déjeuner.",
    goals: [
      "Introduce your reservation",
      "Ask about breakfast",
      "Request something for the room",
    ],
    minutes: 5,
  },
];
export type Memory = {
  id: string;
  kind: "correction" | "expression";
  original: string;
  sent: string;
  corrected: string;
  explanation: string;
  prompt: string;
  topic: Topic;
  scene: string;
  occurrences: number;
  accepted: boolean;
  reviews: number;
  due: number;
  created: number;
};
export type Notebook = { cards: Memory[]; seen: string[] };
/** Preserve dismissed event IDs: navigating back to a session must not resurrect a deleted card. */
export function collectMemories(
  book: Notebook,
  session: Session,
  now = Date.now(),
): Notebook {
  const seen = new Set(book.seen);
  const cards = book.cards.map((c) => ({ ...c }));
  let changed = false;
  session.messages.forEach((message, index) => {
    if (message.role !== "assistant" || !message.correction) return;
    const event = `${session.id}:${message.id}`;
    if (seen.has(event)) return;
    const user = session.messages
      .slice(0, index)
      .reverse()
      .find((m) => m.role === "user");
    if (!user) return;
    seen.add(event);
    changed = true;
    const match = cards.find(
      (c) =>
        c.kind === "correction" &&
        c.sent === user.content &&
        c.corrected === (message.corrected_text || ""),
    );
    if (match) {
      match.occurrences++;
      match.due = now;
      return;
    }
    cards.unshift({
      id: event,
      kind: "correction",
      original: user.original_transcript ?? user.content,
      sent: user.content,
      corrected: message.corrected_text || "",
      explanation: message.correction,
      prompt:
        message.review_prompt ||
        "Try this expression in a different situation.",
      topic: session.topic,
      scene: session.options?.scene || session.topic,
      occurrences: 1,
      accepted: false,
      reviews: 0,
      due: now,
      created: now,
    });
  });
  return changed ? { cards, seen: [...seen] } : book;
}
export function reviewMemory(
  card: Memory,
  remembered: boolean,
  now = Date.now(),
): Memory {
  const reviews = remembered ? card.reviews + 1 : 0;
  const days = remembered ? [1, 3, 7, 14, 30][Math.min(reviews - 1, 4)] : 0;
  return { ...card, accepted: true, reviews, due: now + days * 86400000 };
}
