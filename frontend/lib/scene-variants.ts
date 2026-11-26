import type { Topic } from "./types";
export const sceneVariants: { category:string; topic:Topic; zh:string; en:string; situation:string; opening:string; goals:string[] }[] = [
  {
    "category": "admin",
    "topic": "customer_service",
    "zh": "联系房东",
    "en": "Call your landlord",
    "situation": "Tu es propriétaire. Le locataire signale une panne de chauffage et souhaite organiser une réparation.",
    "opening": "Bonjour, qu'est-ce qui ne fonctionne plus dans l'appartement ?",
    "goals": [
      "说明问题",
      "约定维修时间"
    ]
  },
  {
    "category": "admin",
    "topic": "customer_service",
    "zh": "居留手续",
    "en": "Residence paperwork",
    "situation": "Tu es au guichet fictif de la préfecture. Aide à clarifier les pièces demandées sans donner de conseil juridique.",
    "opening": "Bonjour, pour quelle démarche avez-vous rendez-vous ?",
    "goals": [
      "说明办理事项",
      "询问所需材料"
    ]
  },
  {
    "category": "admin",
    "topic": "customer_service",
    "zh": "联系 CAF / CPAM",
    "en": "Benefits or health insurance office",
    "situation": "Tu es un agent fictif. Clarifie la demande sans promettre de droits ou de prestations.",
    "opening": "Bonjour, comment puis-je vous renseigner ?",
    "goals": [
      "说明情况",
      "询问下一步"
    ]
  },
  {
    "category": "admin",
    "topic": "bank_card",
    "zh": "购买保险",
    "en": "Arrange insurance",
    "situation": "Tu es conseiller en assurance fictif. Présente deux offres imaginaires et leurs différences.",
    "opening": "Bonjour, quel type d'assurance recherchez-vous ?",
    "goals": [
      "说明需求",
      "比较选择"
    ]
  },
  {
    "category": "daily",
    "topic": "shopping",
    "zh": "退换商品",
    "en": "Return an item",
    "situation": "Tu es vendeur. Un article acheté hier ne convient pas, discute des possibilités de retour.",
    "opening": "Bonjour, vous souhaitez échanger un article ?",
    "goals": [
      "说明原因",
      "询问退款"
    ]
  },
  {
    "category": "daily",
    "topic": "shopping",
    "zh": "理发",
    "en": "At the hairdresser",
    "situation": "Tu es coiffeuse, demande le résultat souhaité puis clarifie la longueur.",
    "opening": "Bonjour ! Qu'est-ce qu'on fait aujourd'hui ?",
    "goals": [
      "描述发型",
      "确认长度"
    ]
  },
  {
    "category": "daily",
    "topic": "restaurant",
    "zh": "外卖送错",
    "en": "Wrong takeaway order",
    "situation": "Tu travailles dans un restaurant. Une commande livrée ne correspond pas à ce qui a été commandé.",
    "opening": "Bonjour, quel est le problème avec votre commande ?",
    "goals": [
      "说明问题",
      "提出解决方案"
    ]
  },
  {
    "category": "daily",
    "topic": "symptoms",
    "zh": "药房沟通",
    "en": "At the pharmacy",
    "situation": "Tu joues une pharmacienne dans une situation fictive. Aide à pratiquer la description d'un besoin sans diagnostic ni recommandation médicale.",
    "opening": "Bonjour, qu'est-ce qui vous amène ?",
    "goals": [
      "说明需求",
      "询问使用说明"
    ]
  },
  {
    "category": "social",
    "topic": "friends",
    "zh": "参加聚会",
    "en": "At a party",
    "situation": "Tu viens de rencontrer l'apprenant à une soirée. Apprends à le connaître naturellement.",
    "opening": "Salut ! Tu connais quelqu'un ici ?",
    "goals": [
      "开启话题",
      "追问"
    ]
  },
  {
    "category": "social",
    "topic": "friends",
    "zh": "表达不满",
    "en": "Express frustration",
    "situation": "Tu es un ami qui arrive en retard. Écoute une remarque et cherche un compromis.",
    "opening": "Désolée pour le retard, ça fait longtemps que tu attends ?",
    "goals": [
      "表达感受",
      "提出建议"
    ]
  },
  {
    "category": "social",
    "topic": "self_intro",
    "zh": "见朋友的父母",
    "en": "Meet a friend's parents",
    "situation": "Tu accueilles un invité à dîner, de manière chaleureuse et naturelle.",
    "opening": "Bonsoir ! Bienvenue, vous avez fait bonne route ?",
    "goals": [
      "自我介绍",
      "礼貌闲聊"
    ]
  },
  {
    "category": "study",
    "topic": "report",
    "zh": "同事闲聊",
    "en": "Chat with a colleague",
    "situation": "Tu es collègue pendant la pause café. Discute du week-end et du travail.",
    "opening": "Salut ! Tu as passé un bon week-end ?",
    "goals": [
      "加入对话",
      "自然追问"
    ]
  },
  {
    "category": "study",
    "topic": "report",
    "zh": "开会与不同意见",
    "en": "Disagree in a meeting",
    "situation": "Tu es collègue. Propose un plan, écoute les objections et négocie une alternative.",
    "opening": "Je propose qu'on lance le projet lundi. Qu'en pensez-vous ?",
    "goals": [
      "表达不同意见",
      "提出替代方案"
    ]
  },
  {
    "category": "study",
    "topic": "report",
    "zh": "工作电话",
    "en": "Work phone call",
    "situation": "Tu es collègue au téléphone. Clarifie une tâche et confirme un délai.",
    "opening": "Bonjour, vous avez un instant pour faire le point ?",
    "goals": [
      "请求澄清",
      "确认下一步"
    ]
  },
  {
    "category": "study",
    "topic": "report",
    "zh": "薪资沟通",
    "en": "Discuss salary",
    "situation": "Tu es responsable hiérarchique dans une entreprise fictive. L’employé souhaite discuter de sa rémunération, écoute ses arguments et pose des questions sur ses contributions. N’invente pas de promesse réelle.",
    "opening": "Bonjour, tu souhaitais faire un point sur ta rémunération ?",
    "goals": [
      "说明工作贡献",
      "表达薪资期望"
    ]
  }
];
