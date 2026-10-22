import type { Topic } from "./types";
export const scenarios: Record<
  Topic,
  {
    label: string;
    subtitle: string;
    title: string;
    description: string;
    prompt: string;
    starters: string[];
    vocabulary: [string, string][];
  }
> = {
  daily: {
    label: "日常生活",
    subtitle: "LES PETITS MOMENTS",
    title: "把日常，聊成法语。",
    description: "从今天的小事开始，不必完美，先开口就很好。",
    prompt: "聊聊今天做了什么，或分享一个你喜欢的周末计划。",
    starters: [
      "Aujourd’hui, j’ai envie de…",
      "Pendant mon temps libre, j’aime…",
      "Ce week-end, je voudrais…",
    ],
    vocabulary: [
      ["avoir envie de", "想要做……"],
      ["prendre son temps", "慢慢来"],
      ["se promener", "散步"],
    ],
  },
  cafe: {
    label: "巴黎咖啡馆",
    subtitle: "UN CAFÉ, S’IL VOUS PLAÎT",
    title: "下一站，街角咖啡馆。",
    description: "一杯咖啡，一段对话。练习自然地点单与表达偏好。",
    prompt: "向店员打招呼，点一杯喜欢的饮品，再问问有什么甜点。",
    starters: [
      "Je voudrais un café, s’il vous plaît.",
      "Qu’est-ce que vous me conseillez ?",
      "Est-ce que vous avez du lait d’avoine ?",
    ],
    vocabulary: [
      ["un café allongé", "美式／加水浓缩"],
      ["sur place", "堂食"],
      ["à emporter", "外带"],
    ],
  },
  travel: {
    label: "法国旅行",
    subtitle: "ON PREND LE LARGE",
    title: "让法语，带你去远方。",
    description: "问路、订房、探索一座新城市，轻松练习旅途表达。",
    prompt: "告诉对方你想去哪里，再问一个交通或住宿的问题。",
    starters: [
      "J’aimerais visiter Lyon.",
      "Comment aller à la gare ?",
      "Je voudrais réserver une chambre.",
    ],
    vocabulary: [
      ["un aller-retour", "往返票"],
      ["réserver", "预订"],
      ["le centre-ville", "市中心"],
    ],
  },
  interview: {
    label: "面试练习",
    subtitle: "À VOUS DE JOUER",
    title: "用法语，自信介绍自己。",
    description: "从自我介绍到项目经历，让表达更清晰、更自然。",
    prompt: "用两三句话介绍自己，并说说最近完成的一件事。",
    starters: [
      "Je m’appelle… et je travaille dans…",
      "Mon point fort, c’est…",
      "Récemment, j’ai travaillé sur…",
    ],
    vocabulary: [
      ["une expérience", "一段经历"],
      ["une compétence", "一项技能"],
      ["travailler en équipe", "团队合作"],
    ],
  },
};
