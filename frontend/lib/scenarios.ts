import { catalog } from "./catalog";
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
> = Object.fromEntries(
  catalog.map((scene) => [
    scene.id,
    {
      label: scene.zh,
      subtitle: scene.en.toUpperCase(),
      title: scene.zh,
      description: scene.en,
      prompt: scene.zh,
      starters: [
        scene.opening,
        "Pouvez-vous m’aider ?",
        "Merci pour votre aide.",
      ],
      vocabulary: [],
    },
  ]),
) as unknown as Record<
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
>;
Object.assign(scenarios, {
  restaurant: {
    label: "餐厅晚餐",
    subtitle: "UNE TABLE POUR DEUX",
    title: "今晚，用法语点一道菜。",
    description: "从订位、点餐到结账，把一顿晚餐聊得从容。",
    prompt: "说明人数，询问一道菜的配料，再礼貌地结账。",
    starters: [
      "Une table pour deux, s’il vous plaît.",
      "Qu’est-ce que vous conseillez ?",
      "L’addition, s’il vous plaît.",
    ],
    vocabulary: [
      ["une entrée", "前菜"],
      ["le plat du jour", "今日推荐主菜"],
      ["l’addition", "账单"],
    ],
  },
  shopping: {
    label: "逛街购物",
    subtitle: "UN PETIT COUP DE CŒUR",
    title: "找到喜欢的，也说出喜欢。",
    description: "询问尺码、试穿和价格，练习真实的购物对话。",
    prompt: "告诉店员你想买什么，询问尺码，并说明你的预算。",
    starters: [
      "Je cherche une veste.",
      "Vous avez cette taille ?",
      "Est-ce que je peux l’essayer ?",
    ],
    vocabulary: [
      ["la taille", "尺码"],
      ["essayer", "试穿"],
      ["la cabine d’essayage", "试衣间"],
    ],
  },
  doctor: {
    label: "预约看诊",
    subtitle: "TROUVER LES BONS MOTS",
    title: "把需要，清楚地说出来。",
    description: "练习向诊所预约和说明来意，仅作语言练习。",
    prompt: "向诊所前台说明预约来意，询问时间并确认信息。这不是医疗建议。",
    starters: [
      "Je voudrais prendre rendez-vous.",
      "Avez-vous une place demain ?",
      "Pouvez-vous répéter l’heure ?",
    ],
    vocabulary: [
      ["un rendez-vous", "预约"],
      ["disponible", "有空的／可预约的"],
      ["confirmer", "确认"],
    ],
  },
  friends: {
    label: "朋友邀约",
    subtitle: "ON SE RETROUVE ?",
    title: "从一句邀请，开始一个周末。",
    description: "提议、回应、商量时间，让法语更像自然聊天。",
    prompt: "约朋友做一件事，听听对方的想法，再定下时间地点。",
    starters: [
      "Ça te dit d’aller au cinéma ?",
      "Tu es libre samedi ?",
      "On se retrouve où ?",
    ],
    vocabulary: [
      ["ça te dit de…", "你想不想……"],
      ["se retrouver", "碰面"],
      ["avec plaisir", "很乐意"],
    ],
  },
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
});
