import { assistantOpening } from "./persona";
import { catalog } from "./catalog";
import type { api } from "./api";
import type { Session, Topic } from "./types";

const openings = Object.fromEntries(
  catalog.map((scene) => [scene.id, assistantOpening(scene.opening)]),
) as Record<Topic, string>;
const sessions = new Map<string, Session>();
const KEY = "parlons-local-demo-data";
function restore() {
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (Array.isArray(stored))
      for (const item of stored) {
        if (
          item &&
          typeof item.id === "string" &&
          item.topic in openings &&
          Array.isArray(item.messages)
        )
          sessions.set(item.id, item);
      }
  } catch {
    /* Demo works in memory if storage is blocked. */
  }
}
function save() {
  try {
    localStorage.setItem(
      KEY,
      JSON.stringify(Array.from(sessions.values()).slice(-20)),
    );
  } catch {
    /* Nonessential demo persistence. */
  }
}
function tone() {
  const length = 3200;
  const buffer = new ArrayBuffer(44 + length * 2);
  const view = new DataView(buffer);
  const text = (offset: number, value: string) =>
    [...value].forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)));
  text(0, "RIFF");
  view.setUint32(4, 36 + length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, length * 2, true);
  for (let i = 0; i < length; i++)
    view.setInt16(
      44 + i * 2,
      Math.sin((i * 2 * Math.PI * 440) / 16000) * 1800 * (1 - i / length),
      true,
    );
  return new Blob([buffer], { type: "audio/wav" });
}
/** Local, scripted UI demonstration. No fetch, providers, microphone or real evaluation. */
export const demoApi: typeof api = {
  rewrite: async (text, style, language) =>
    style === "slang"
      ? {
          expression: /^J[’']aime cette musique\.$/.test(text.trim())
            ? "Je kiffe cette musique."
            : text.replace(/\bune café(?=[\s.,!?;:]|$)/gi, "un café"),
          explanation: /^J[’']aime cette musique\.$/.test(text.trim())
            ? language === "zh"
              ? "示例：kiffer 表示 aimer，属于俚语，不是 verlan。适合熟人之间，正式场景仍用 aimer。"
              : "Demo: kiffer means aimer. Familiar slang, not verlan; use among peers, not in formal settings."
            : language === "zh"
              ? "模拟示例：此句未配置合适的俚语替换，不强行造词；普通口语不等于俚语。"
              : "Mock fixture: no suitable slang rewrite is configured here. Casual wording alone is not slang.",
        }
      : {
          expression: text.replace(
            /\bje voudrais une? café(?=[\s.,!?;:]|$)/gi,
            "Je souhaiterais un café",
          ),
          explanation:
            language === "zh"
              ? "模拟示例：保留完整发言，仅对已配置的点单句式展示更礼貌表达，其余保持原句。"
              : "Mock fixture: keeps your full message; only configured coffee requests are rewritten politely, other wording stays unchanged.",
        },

  translate: async (text, language) => ({
    translation:
      /^(示例反馈|Demo feedback):/.test(text) && /café/.test(text)
        ? language === "zh"
          ? "示例反馈：café 是阳性名词，应使用 un café。"
          : "Demo feedback: café is masculine. Say un café."
        : language === "zh"
          ? "演示翻译：这是法语回答的中文意思。"
          : "Demo translation of this French reply.",
  }),
  health: async () => ({
    mode: "mock",
    speech_ready: true,
    stt_ready: true,
    mock_ai: true,
  }),
  voices: async () => ({
    voices: [{ id: "default", name: "Demo tone (not a voice)" }],
  }),
  session: async (id, topic, options) => {
    restore();
    if (!sessions.has(id)) {
      sessions.set(id, {
        id,
        topic,
        options,
        messages: [
          {
            id: 1,
            role: "assistant",
            content: options?.situation
              ? assistantOpening(
                  "Bonjour ! On joue cette situation ensemble. De quoi avez-vous besoin ?",
                )
              : openings[topic],
          },
        ],
      });
      save();
    }
    return structuredClone(sessions.get(id)!);
  },
  history: async (id) => {
    const session = sessions.get(id);
    if (!session) throw new Error("Demo session not found");
    return structuredClone(session);
  },
  chat: async (id, text, transcriptId, preferences) => {
    const session = sessions.get(id);
    if (!session) throw new Error("Demo session not found");
    await new Promise((resolve) => setTimeout(resolve, 650));
    let correction = "";
    if (/une café/i.test(text))
      correction =
        "示例反馈：café 是阳性名词，应说 un café。可以说：Je voudrais un café, s’il vous plaît.";
    else if (/je suis aller/i.test(text))
      correction =
        "示例反馈：aller 的过去分词是 allé。这里可说 Je suis allé au café.；女性说话者用 allée。";
    if (preferences?.language === "en" && correction) {
      correction = /une café/i.test(text)
        ? "Demo feedback: café is masculine. Say un café."
        : "Demo feedback: use the past participle allé (allée for a female speaker).";
    }
    if (preferences?.practice_mode === "conversation") correction = "";
    const replies: Partial<Record<Topic, string>> = {
      restaurant:
        "Bien sûr ! Je vous recommande le plat du jour. Souhaitez-vous voir la carte ?",
      shopping:
        "Avec plaisir ! Quelle taille cherchez-vous ? Vous pouvez l’essayer ici.",
      doctor:
        "Nous avons un créneau demain à dix heures. Est-ce que cela vous convient ?",
      friends:
        "Ça me fait plaisir de discuter avec toi ! Qu’est-ce qui t’occupe en ce moment ?",
      cafe: "Avec plaisir ! Vous préférez un espresso ou un café allongé ? Et avec ça, un croissant ?",
      daily: "Merci de partager ça ! Qu’est-ce que tu aimerais faire ensuite ?",
      travel:
        "Très bon choix ! Tu préfères découvrir les musées ou te promener dans la ville ?",
      interview:
        "Merci pour cette présentation. Pouvez-vous me parler d’un projet qui vous tient à cœur ?",
    };
    let reply =
      replies[session.topic] ||
      "D’accord ! Pouvez-vous m’en dire un peu plus sur ce dont vous avez besoin ?";
    // A labeled demo fixture, not a simulation of general model understanding.
    const social =
      catalog.find((item) => item.id === session.topic)?.category ===
        "social" &&
      !session.options?.situation &&
      !session.options?.review_targets?.length;
    const interviewQuestion =
      "Ah, tu prépares un entretien ! C’est pour quel type de poste ?";
    if (
      social &&
      text.trim() === "En semaine, je prépare un entretien, donc plutôt samedi."
    ) {
      reply = interviewQuestion;
    } else if (
      social &&
      session.messages.at(-1)?.content === interviewQuestion
    ) {
      reply =
        "J’espère que ça se passera bien ! On garde samedi après-midi pour se voir ?";
    }
    const nextId = session.messages.length + 1;
    session.messages.push(
      {
        id: nextId,
        role: "user",
        content: text,
        ...(transcriptId
          ? {
              original_transcript: "Je voudrais une café, s’il vous plaît.",
              edited_transcript: text,
            }
          : {}),
      },
      {
        id: nextId + 1,
        role: "assistant",
        content: reply,
        correction,
        corrected_text: /une café/i.test(text)
          ? text.replace(/une café/gi, "un café")
          : /je suis aller/i.test(text)
            ? text.replace(/je suis aller/gi, "Je suis allé")
            : "",
        review_prompt: correction
          ? "换一种饮品，试着用正确的冠词礼貌点单。"
          : "",
      },
    );
    save();
    return { reply, correction, mode: "mock" };
  },
  review: async (_id, language) => ({
    summary:
      language === "en"
        ? "Scripted demo review. No real language assessment."
        : "这是预设演示总结，不评估真实语言水平。",
    strengths: [],
    corrections: [],
  }),
  transcribe: async () => ({
    id: "demo-transcript",
    original_text: "Je voudrais une café, s’il vous plaît.",
  }),
  synthesize: async () => tone(),
};
