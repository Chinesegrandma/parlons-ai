import type { Topic } from "./types";
import { catalog } from "./catalog";
import { sceneVariants } from "./scene-variants";

type Group = {category:string; id:string; zh:string; en:string; topics:Topic[]; variants:string[]};
export const practiceGroups: Group[] = [
  {
    "category": "admin",
    "id": "bank",
    "zh": "银行",
    "en": "Banking",
    "topics": [
      "bank_card",
      "bank_transfer"
    ],
    "variants": []
  },
  {
    "category": "admin",
    "id": "health",
    "zh": "医疗健康",
    "en": "Healthcare",
    "topics": [
      "doctor",
      "symptoms"
    ],
    "variants": [
      "药房沟通"
    ]
  },
  {
    "category": "admin",
    "id": "housing",
    "zh": "住房",
    "en": "Housing",
    "topics": [
      "renting"
    ],
    "variants": [
      "联系房东"
    ]
  },
  {
    "category": "admin",
    "id": "paperwork",
    "zh": "行政手续",
    "en": "Public administration",
    "topics": [],
    "variants": [
      "居留手续",
      "联系 CAF / CPAM"
    ]
  },
  {
    "category": "admin",
    "id": "insurance",
    "zh": "保险",
    "en": "Insurance",
    "topics": [],
    "variants": [
      "购买保险"
    ]
  },
  {
    "category": "admin",
    "id": "services",
    "zh": "邮寄与客服",
    "en": "Postal & customer services",
    "topics": [
      "post",
      "customer_service"
    ],
    "variants": []
  },
  {
    "category": "daily",
    "id": "food",
    "zh": "餐饮",
    "en": "Food & drink",
    "topics": [
      "restaurant",
      "cafe"
    ],
    "variants": [
      "外卖送错"
    ]
  },
  {
    "category": "daily",
    "id": "shopping",
    "zh": "购物",
    "en": "Shopping",
    "topics": [
      "shopping"
    ],
    "variants": [
      "退换商品"
    ]
  },
  {
    "category": "daily",
    "id": "transport",
    "zh": "出行",
    "en": "Transport & directions",
    "topics": [
      "transport",
      "travel"
    ],
    "variants": []
  },
  {
    "category": "daily",
    "id": "personal",
    "zh": "个人服务",
    "en": "Personal services",
    "topics": [],
    "variants": [
      "理发"
    ]
  },
  {
    "category": "social",
    "id": "meeting",
    "zh": "认识新朋友",
    "en": "Meeting people",
    "topics": [
      "self_intro"
    ],
    "variants": [
      "参加聚会",
      "见朋友的父母"
    ]
  },
  {
    "category": "social",
    "id": "friends",
    "zh": "朋友相处",
    "en": "Friendships",
    "topics": [
      "friends"
    ],
    "variants": [
      "表达不满"
    ]
  },
  {
    "category": "social",
    "id": "plans",
    "zh": "邀请与约定",
    "en": "Invitations & plans",
    "topics": [
      "invite",
      "decline"
    ],
    "variants": []
  },
  {
    "category": "study",
    "id": "school",
    "zh": "学校",
    "en": "School",
    "topics": [
      "course",
      "teacher"
    ],
    "variants": []
  },
  {
    "category": "study",
    "id": "work",
    "zh": "工作",
    "en": "Work",
    "topics": [
      "report"
    ],
    "variants": [
      "同事闲聊",
      "开会与不同意见",
      "工作电话"
    ]
  },
  {
    "category": "interview",
    "id": "recruitment",
    "zh": "求职面试",
    "en": "Job interviews",
    "topics": [
      "interview"
    ],
    "variants": [
      "HR 面试",
      "技术面试"
    ]
  },
  {
    "category": "interview",
    "id": "negotiation",
    "zh": "录用与薪资",
    "en": "Offers & salary",
    "topics": [],
    "variants": [
      "薪资谈判"
    ]
  }
];
export const sceneTitle = (topic:Topic, language:"zh"|"en") => topic === "interview" ? (language==="zh"?"综合模拟面试":"Full mock interview") : catalog.find(s=>s.id===topic)?.[language] || topic;
export function groupContent(group:Group) {
  return {scenes: group.topics.map(id=>catalog.find(s=>s.id===id)!).filter(Boolean), variants:group.variants.map(name=>sceneVariants.find(v=>v.zh===name)!).filter(Boolean)};
}
