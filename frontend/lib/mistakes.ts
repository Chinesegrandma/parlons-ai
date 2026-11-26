import type { Notebook } from "./learning";
import type { MistakeCategory, Review, Session } from "./types";

export type Mistake = {
  id: string;
  sessionId: string;
  category: MistakeCategory;
  original: string;
  suggestion: string;
  explanation: string;
  context: string;
};

export const categories: { id: MistakeCategory; zh: string; en: string }[] = [
  { id: "tense", zh: "时态与语气", en: "Tense & mood" },
  { id: "conjugation", zh: "动词变位", en: "Verb forms" },
  { id: "agreement", zh: "阴阳性与单复数", en: "Agreement" },
  { id: "article", zh: "冠词", en: "Articles" },
  { id: "preposition", zh: "介词", en: "Prepositions" },
  { id: "pronoun", zh: "代词", en: "Pronouns" },
  { id: "syntax", zh: "语序与句型", en: "Syntax" },
  { id: "vocabulary", zh: "词汇与搭配", en: "Vocabulary" },
  { id: "spelling", zh: "拼写", en: "Spelling" },
  { id: "other", zh: "其他 / 待分类", en: "Other / unclassified" },
];

export function collectMistakes(book: Notebook, session: Session, review?: Review): Notebook {
  const items = [...(book.mistakes || [])];
  const ignored = new Set(book.ignoredMistakes || []);
  let changed = false;
  function add(detail: Review["corrections"][number], user: Session["messages"][number], summary = false) {
    if (!detail.original || !detail.suggestion || detail.original === detail.suggestion || !user.content.includes(detail.original)) return;
    const id = JSON.stringify([session.id, user.id, detail.original, detail.suggestion]);
    if (ignored.has(id)) return;
    const category = categories.some((entry) => entry.id === detail.category) ? detail.category! : "other";
    const index = items.findIndex((entry) => entry.id === id || (summary && entry.sessionId === session.id && entry.original === detail.original && entry.suggestion === detail.suggestion));
    if (index >= 0) {
      if (items[index].category === "other" && category !== "other") {
        items[index] = { ...items[index], category };
        changed = true;
      }
      return;
    }
    items.unshift({ id, sessionId: session.id, category, original: detail.original, suggestion: detail.suggestion, explanation: detail.explanation, context: user.content });
    changed = true;
  }
  session.messages.forEach((message, index) => {
    if (message.role !== "assistant") return;
    const user = session.messages.find((item) => item.id === message.feedback_for && item.role === "user") || session.messages.slice(0, index).reverse().find((item) => item.role === "user");
    if (!user) return;
    for (const detail of message.correction_details || []) add(detail, user);
  });
  for (const detail of review?.corrections || []) {
    const user = session.messages.find((item) => item.role === "user" && item.content.includes(detail.original));
    if (user) add(detail, user, true);
  }
  return changed ? { ...book, mistakes: items } : book;
}

type Question = { prompt: string; options: [string, string]; answer: number; zh: string; en: string; personal?: boolean };
const examples: Record<Exclude<MistakeCategory, "other">, Question[]> = {
  tense: [
    { prompt: "Quand j’étais petit, je ___ au parc tous les jours.", options: ["suis allé", "allais"], answer: 1, zh: "过去的习惯用未完成过去时。", en: "Use the imperfect for a past habit." },
    { prompt: "Hier, à midi, le train ___ à la gare.", options: ["est arrivé", "arrivera"], answer: 0, zh: "昨天已经完成的事件用复合过去时。", en: "A completed past event takes passé composé." },
  ],
  conjugation: [
    { prompt: "Tu ___ français tous les jours.", options: ["parle", "parles"], answer: 1, zh: "tu 对应 parles。", en: "Tu takes parles." },
    { prompt: "Nous ___ à Paris.", options: ["sommes", "sont"], answer: 0, zh: "être 的 nous 变位是 sommes。", en: "Nous takes sommes." },
  ],
  agreement: [
    { prompt: "Une robe ___.", options: ["verte", "vert"], answer: 0, zh: "robe 为阴性，形容词也用阴性。", en: "Robe is feminine; the adjective agrees." },
    { prompt: "Des chaussures ___.", options: ["noire", "noires"], answer: 1, zh: "形容词与复数阴性名词配合。", en: "Agree with a feminine plural noun." },
  ],
  article: [
    { prompt: "Je voudrais ___ café, s’il vous plaît.", options: ["une", "un"], answer: 1, zh: "café 是阳性名词。", en: "Café is masculine." },
    { prompt: "Elle boit ___ eau.", options: ["de l’", "du"], answer: 0, zh: "元音前使用 de l’。", en: "Use de l’ before a vowel." },
  ],
  preposition: [
    { prompt: "J’habite ___ France.", options: ["en", "à"], answer: 0, zh: "France 是阴性国家名，使用 en。", en: "Use en with France." },
    { prompt: "Je pense souvent ___ toi.", options: ["de", "à"], answer: 1, zh: "penser à 表示想起某人。", en: "Penser à means to think of someone." },
  ],
  pronoun: [
    { prompt: "Je vois Marie. Je ___ vois.", options: ["lui", "la"], answer: 1, zh: "voir 接直接宾语，使用 la。", en: "Voir takes a direct object: la." },
    { prompt: "Je parle à Paul. Je ___ parle.", options: ["lui", "le"], answer: 0, zh: "parler à 接间接宾语，使用 lui。", en: "Parler à takes an indirect object: lui." },
  ],
  syntax: [
    { prompt: "Choose the standard written negative sentence.", options: ["Je ne comprends pas.", "Je pas comprends ne."], answer: 0, zh: "ne 与 pas 包围变位动词。", en: "Ne and pas surround the conjugated verb." },
    { prompt: "Choose the standard written question.", options: ["Où tu habites est-ce que ?", "Où est-ce que tu habites ?"], answer: 1, zh: "疑问词在 est-ce que 之前。", en: "The question word precedes est-ce que." },
  ],
  vocabulary: [
    { prompt: "Il ___ froid aujourd’hui.", options: ["est", "fait"], answer: 1, zh: "天气表达使用 il fait froid。", en: "Use il fait froid for weather." },
    { prompt: "J’ai ___ une décision.", options: ["pris", "fait"], answer: 0, zh: "固定搭配 prendre une décision。", en: "The expression is prendre une décision." },
  ],
  spelling: [
    { prompt: "Je vais ___ Paris.", options: ["a", "à"], answer: 1, zh: "介词 à 需要重音符号。", en: "The preposition à has a grave accent." },
    { prompt: "Je suis ___ de te voir.", options: ["content", "contant"], answer: 0, zh: "高兴的形容词写作 content。", en: "The adjective for happy is content." },
  ],
};

export function questionsFor(category: MistakeCategory, mistakes: Mistake[]): Question[] {
  const personal = mistakes.filter((item) => item.category === category).slice(0, 8).map((item, index): Question => ({
    prompt: item.context.replace(item.original, "___"),
    options: index % 2 ? [item.suggestion, item.original] : [item.original, item.suggestion],
    answer: index % 2 ? 0 : 1,
    zh: item.explanation,
    en: item.explanation,
    personal: true,
  }));
  return [...personal, ...(category === "other" ? [] : examples[category])];
}
