import type { Topic } from "./types";

export const practice: Record<
  Topic,
  { level: string; goals: [string, string, string] }
> = {
  daily: {
    level: "A2 · 日常叙述",
    goals: ["说说今天发生的小事", "表达你的喜好与原因", "聊一个接下来的计划"],
  },
  cafe: {
    level: "A1 · 点单入门",
    goals: ["打招呼并点一杯饮品", "询问推荐或甜点", "说明饮品偏好"],
  },
  travel: {
    level: "A2 · 旅行沟通",
    goals: ["说出想去的目的地", "询问路线或交通", "询问住宿安排"],
  },
  interview: {
    level: "B1 · 职场表达",
    goals: ["简短介绍你的背景", "举例说明一项优势", "分享最近的项目经历"],
  },
  restaurant: {
    level: "A1 · 用餐沟通",
    goals: ["说明用餐人数", "询问推荐并点菜", "礼貌地请求结账"],
  },
  shopping: {
    level: "A1 · 购物交流",
    goals: ["告诉店员你想买什么", "询问合适的尺码", "提出试穿请求"],
  },
  doctor: {
    level: "A2 · 预约沟通",
    goals: ["向前台提出预约请求", "询问可预约的时间", "复述并确认预约时间"],
  },
  friends: {
    level: "A2 · 自然聊天",
    goals: ["向朋友发出邀请", "商量一个合适的时间", "确认见面地点"],
  },
};
