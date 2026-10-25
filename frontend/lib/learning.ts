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
    title: "第一天入职",
    french: "Enchanté, moi c’est…",
    situation:
      "Premier jour dans une entreprise. Tu es un collègue qui accueille la nouvelle recrue.",
    goals: ["介绍自己", "了解团队", "确认第一项任务"],
    minutes: 5,
  },
  {
    id: "presentation",
    category: "Work",
    topic: "interview",
    title: "第一次做汇报",
    french: "Aujourd’hui, je vous présente…",
    situation:
      "Une présentation de projet à une collègue. Écoute puis pose une question précise.",
    goals: ["介绍项目", "说明项目价值", "回答追问"],
    minutes: 7,
  },
  {
    id: "project-update",
    category: "Work",
    topic: "interview",
    title: "汇报项目进度",
    french: "Voilà où nous en sommes.",
    situation:
      "Tu es le responsable de projet. Demande un point d’avancement, un obstacle et les prochaines étapes.",
    goals: ["说明进展", "解释一个困难", "确认下一步"],
    minutes: 5,
  },
  {
    id: "lunch",
    category: "Work",
    topic: "friends",
    title: "和同事吃午饭",
    french: "On déjeune ensemble ?",
    situation:
      "Tu es un collègue à la pause déjeuner. Discute du repas puis des projets du week-end.",
    goals: ["加入对话", "自然地追问", "邀请下周再聚"],
    minutes: 5,
  },
  {
    id: "clarify",
    category: "Work",
    topic: "interview",
    title: "请对方再说一次",
    french: "Si j’ai bien compris…",
    situation:
      "Tu es un collègue qui explique une tâche. L’apprenant s’entraîne à demander une précision puis à reformuler.",
    goals: ["请求澄清", "复述要求", "确认截止时间"],
    minutes: 4,
  },
  {
    id: "disagree",
    category: "Work",
    topic: "interview",
    title: "礼貌表达不同意见",
    french: "Je vois les choses autrement.",
    situation:
      "En réunion, propose une solution puis laisse l’apprenant exprimer un désaccord et une alternative.",
    goals: ["回应对方观点", "说明顾虑", "提出替代方案"],
    minutes: 6,
  },
  {
    id: "coffee",
    category: "Everyday",
    topic: "cafe",
    title: "点一杯咖啡",
    french: "Un café, s’il vous plaît.",
    situation:
      "Tu es un serveur dans un café à Paris. Prends une commande et demande sur place ou à emporter.",
    goals: ["点一杯饮品", "询问甜点", "选择堂食或外带"],
    minutes: 3,
  },
  {
    id: "appointment",
    category: "Everyday",
    topic: "doctor",
    title: "预约一个时间",
    french: "Vous avez un créneau ?",
    situation:
      "Tu es secrétaire. Organise un rendez-vous, sans conseil médical.",
    goals: ["说明需求", "约定时间", "核对信息"],
    minutes: 4,
  },
  {
    id: "dinner",
    category: "Everyday",
    topic: "restaurant",
    title: "两个人的晚餐",
    french: "Une table pour deux.",
    situation:
      "Tu es serveur. Aide à choisir un plat et explique les ingrédients.",
    goals: ["询问座位", "询问配料", "请求结账"],
    minutes: 5,
  },
  {
    id: "return",
    category: "Everyday",
    topic: "shopping",
    title: "退换商品",
    french: "Je voudrais l’échanger.",
    situation:
      "Tu es vendeur. Un client souhaite échanger un vêtement acheté hier.",
    goals: ["说明问题", "提出换货", "了解条件"],
    minutes: 5,
  },
  {
    id: "train",
    category: "Travel",
    topic: "travel",
    title: "乘坐火车",
    french: "C’est quel quai ?",
    situation: "Tu travailles à la gare. Aide à trouver un train et son quai.",
    goals: ["询问发车时间", "确认站台", "了解换乘"],
    minutes: 4,
  },
  {
    id: "hotel",
    category: "Travel",
    topic: "travel",
    title: "办理酒店入住",
    french: "J’ai une réservation.",
    situation:
      "Tu es réceptionniste dans un hôtel. Accueille le client et explique le petit-déjeuner.",
    goals: ["说明预订", "询问早餐", "提出房间需求"],
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
      prompt: message.review_prompt || "换个情境，试着使用这个表达。",
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
