import type { api } from "./api";
import type { Session, Topic } from "./types";

const openings: Record<Topic, string> = {
  restaurant: "Bonsoir ! Avez-vous une réservation ?",
  shopping: "Bonjour ! Vous cherchez quelque chose en particulier ?",
  doctor: "Bonjour, cabinet médical. Vous souhaitez prendre rendez-vous ?",
  friends: "Salut ! Tu es libre ce week-end ?",
  daily: "Salut ! Comment s’est passée ta journée ?",
  cafe: "Bonjour et bienvenue ! Qu’est-ce que je vous sers aujourd’hui ?",
  travel: "Bonjour ! Quelle ville française aimerais-tu découvrir ?",
  interview: "Bonjour ! Pour commencer, pouvez-vous vous présenter ?",
};
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
  health: async () => ({
    mode: "mock",
    speech_ready: true,
    stt_ready: true,
    mock_ai: true,
  }),
  session: async (id, topic) => {
    restore();
    if (!sessions.has(id)) {
      sessions.set(id, {
        id,
        topic,
        messages: [{ id: 1, role: "assistant", content: openings[topic] }],
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
  chat: async (id, text, transcriptId) => {
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
    const reply = {
      restaurant:
        "Bien sûr ! Je vous recommande le plat du jour. Souhaitez-vous voir la carte ?",
      shopping:
        "Avec plaisir ! Quelle taille cherchez-vous ? Vous pouvez l’essayer ici.",
      doctor:
        "Nous avons un créneau demain à dix heures. Est-ce que cela vous convient ?",
      friends:
        "Avec plaisir ! Samedi après-midi, ça te va ? On peut se retrouver devant le cinéma.",
      cafe: "Avec plaisir ! Vous préférez un espresso ou un café allongé ? Et avec ça, un croissant ?",
      daily: "Merci de partager ça ! Qu’est-ce que tu aimerais faire ensuite ?",
      travel:
        "Très bon choix ! Tu préfères découvrir les musées ou te promener dans la ville ?",
      interview:
        "Merci pour cette présentation. Pouvez-vous me parler d’un projet qui vous tient à cœur ?",
    }[session.topic];
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
      { id: nextId + 1, role: "assistant", content: reply, correction },
    );
    save();
    return { reply, correction, mode: "mock" };
  },
  transcribe: async () => ({
    id: "demo-transcript",
    original_text: "Je voudrais une café, s’il vous plaît.",
  }),
  synthesize: async () => tone(),
};
