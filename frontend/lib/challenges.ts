import definitions from "./challenges.json";
import type { Topic } from "./types";
export const challengeDefinitions = definitions;
export const challengeFor = (topic?: Topic) =>
  Object.values(definitions).find((item) => item.id === topic);

export function challengeOpening(
  topic: Topic,
  config?: import("./types").ChallengeOptions | null,
) {
  const item = challengeFor(topic)!;
  const seed = config?.seed ?? 0;
  if (topic === "challenge_describe")
    return "Décris ton mot sans le nommer. Je vais essayer de le deviner à partir de tes indices.";
  const text = item.seeds[seed].fr;
  if (topic === "challenge_opinion")
    return `${text} Donne ton avis avec une raison et, si tu veux, un exemple.`;
  if (topic === "challenge_story")
    return `${text} À toi : ajoute une ou deux phrases.`;
  return `Notre sujet : ${text} Tu es ${config?.side === "against" ? "contre" : "pour"} ; je présenterai le point de vue opposé. Quel est ton premier argument ?`;
}
