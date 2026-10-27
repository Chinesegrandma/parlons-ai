import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  Building2,
  Coffee,
  GraduationCap,
  MessagesSquare,
  BriefcaseBusiness,
  Sparkles,
} from "lucide-react";
import { ChallengeSetup } from "./ChallengeSetup";
import { challengeFor } from "../lib/challenges";
import { catalog } from "../lib/catalog";
import type { Language, Topic, PracticeOptions } from "../lib/types";
const sections = [
  {
    id: "challenge",
    zh: "表达挑战",
    en: "Expression challenges",
    subZh: "观点、猜词、故事与辩论，换一种方式开口",
    subEn: "Opinions, guessing, stories and debate",
    icon: Sparkles,
  },
  {
    id: "admin",
    zh: "办事",
    en: "Life admin",
    subZh: "银行、医院、租房与日常事务",
    subEn: "Banking, appointments, housing & services",
    icon: Building2,
  },
  {
    id: "daily",
    zh: "日常",
    en: "Everyday life",
    subZh: "用餐、购物、交通与问路",
    subEn: "Dining, shopping, transport & directions",
    icon: Coffee,
  },
  {
    id: "social",
    zh: "社交",
    en: "Social life",
    subZh: "认识新朋友，轻松开启话题",
    subEn: "Introductions, conversations & invitations",
    icon: MessagesSquare,
  },
  {
    id: "study",
    zh: "学业与工作",
    en: "Study & work",
    subZh: "学校沟通与工作汇报",
    subEn: "University conversations & project updates",
    icon: GraduationCap,
  },
  {
    id: "interview",
    zh: "面试",
    en: "Interviews",
    subZh: "自信表达经历与优势",
    subEn: "Talk about your experience with confidence",
    icon: BriefcaseBusiness,
  },
];
const groups = {
  bank: ["银行", "Bank"],
  hospital: ["医院", "Hospital"],
  school: ["学校", "School"],
};
export function PracticeHome({
  language,
  onStart,
  disabled,
  onResume,
  canResume = true,
  onCustom,
  level = "B1-B2",
}: {
  language: Language;
  onStart: (topic: Topic, options?: Partial<PracticeOptions>) => void;
  level?: PracticeOptions["level"];
  disabled: boolean;
  onResume: () => void;
  canResume?: boolean;
  onCustom?: (text: string) => void;
}) {
  const [selected, setSelected] = useState<Topic | null>(null);
  const [custom, setCustom] = useState("");
  const [category, setCategory] = useState("");
  const [group, setGroup] = useState("");
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const current = sections.find((section) => section.id === category);
  const available = catalog.filter(
    (scene) =>
      scene.category === category &&
      scene.id !== "daily" &&
      (!group || scene.group === group),
  );
  const grouped = [
    ...new Set(available.map((scene) => scene.group).filter(Boolean)),
  ];
  if (selected)
    return (
      <main className="practice-home">
        <ChallengeSetup
          key={selected}
          topic={selected}
          language={language}
          initialLevel={level}
          disabled={disabled}
          onBack={() => setSelected(null)}
          onStart={onStart}
        />
      </main>
    );
  return (
    <main
      className={`practice-home ${category === "challenge" ? "challenge-home" : ""}`}
    >
      {category !== "challenge" && (
        <>
          <div className="home-intro">
            <span className="eyebrow">UN PEU, CHAQUE JOUR</span>
            <h1>
              {t(
                "让法语，走进你的生活。",
                "A little French. A little more life.",
              )}
            </h1>
            <p>
              {t(
                "选一个真实情境，剩下的对话，让我们一起展开。",
                "Choose a real-life situation. We’ll take the conversation from there.",
              )}
            </p>
          </div>
          <div className="home-quick">
            <div>
              <span className="quick-mark">✦</span>
              <h2>{t("不选场景，也可以聊。", "Just feel like talking?")}</h2>
              <p>
                {t(
                  "从今天发生的小事开始，AI 会主动带你聊下去。",
                  "Start with your day. Your partner will ask the next question.",
                )}
              </p>
            </div>
            <button disabled={disabled} onClick={() => onStart("daily")}>
              {t("直接开始聊天", "Start chatting")} <ArrowUpRight size={18} />
            </button>
          </div>
        </>
      )}
      {category ? (
        <>
          <div className="category-heading">
            <button onClick={() => (group ? setGroup("") : setCategory(""))}>
              <ArrowLeft size={16} />
              {t("返回", "Back")}
            </button>
            <h2>
              {group
                ? groups[group as keyof typeof groups][
                    language === "en" ? 1 : 0
                  ]
                : current?.[language === "en" ? "en" : "zh"]}
            </h2>
            <p>
              {category === "challenge"
                ? t(
                    "选择玩法，再选题目和难度，就可以开始。",
                    "Choose a challenge, then a prompt and difficulty to begin.",
                  )
                : t(
                    "点击具体场景，即可进入对话。",
                    "Choose a situation to enter the conversation.",
                  )}
            </p>
          </div>
          <div className="subscene-grid">
            {!group &&
              grouped.map((id) => (
                <button
                  className="subscene-card"
                  key={id}
                  onClick={() => setGroup(id)}
                >
                  <span>
                    {
                      groups[id as keyof typeof groups][
                        language === "en" ? 1 : 0
                      ]
                    }
                  </span>
                  <small>{t("查看具体事项", "Choose a situation")}</small>
                  <ArrowUpRight size={18} />
                </button>
              ))}
            {available
              .filter((scene) => group || !scene.group)
              .map((scene) => (
                <button
                  className="subscene-card"
                  key={scene.id}
                  disabled={disabled}
                  onClick={() =>
                    scene.category === "challenge"
                      ? setSelected(scene.id)
                      : onStart(scene.id)
                  }
                >
                  <span>{scene[language]}</span>
                  <small>
                    {scene.category === "challenge"
                      ? language === "en"
                        ? challengeFor(scene.id)?.descriptionEn
                        : challengeFor(scene.id)?.descriptionZh
                      : t("进入对话", "Enter conversation")}
                  </small>
                  <ArrowUpRight size={18} />
                </button>
              ))}
          </div>
        </>
      ) : (
        <div className="category-grid">
          {sections.map(({ icon: Icon, ...section }, index) => (
            <button
              aria-label={section[language]}
              className={`category-card category-${section.id}`}
              key={section.id}
              disabled={disabled}
              onClick={() =>
                section.id === "interview"
                  ? onStart("interview")
                  : setCategory(section.id)
              }
            >
              <div>
                <span className="category-icon">
                  <Icon size={25} />
                </span>
                <small>0{index + 1}</small>
              </div>
              <h2>{section[language]}</h2>
              <p>{section[language === "en" ? "subEn" : "subZh"]}</p>
              <span className="category-footer">
                {section.id === "interview"
                  ? t("进入对话", "Enter conversation")
                  : section.id === "challenge"
                    ? t("探索挑战", "Explore challenges")
                    : t("探索场景", "Explore situations")}
                <ArrowUpRight size={18} />
              </span>
            </button>
          ))}
        </div>
      )}
      {onCustom && category !== "challenge" && (
        <details className="custom-practice">
          <summary>
            {t("自定义一个真实情境", "Create your own situation")}
          </summary>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (custom.trim()) onCustom(custom.trim());
            }}
          >
            <label>
              {t("你想练习什么？", "What would you like to practice?")}
              <textarea
                maxLength={1000}
                rows={3}
                value={custom}
                onChange={(event) => setCustom(event.target.value)}
                placeholder={t(
                  "例如：向老师解释我为什么需要延期交作业。",
                  "For example: ask your teacher for a deadline extension.",
                )}
              />
            </label>
            <button
              className="end-review"
              disabled={disabled || !custom.trim()}
            >
              {t("进入对话", "Enter conversation")} →
            </button>
          </form>
        </details>
      )}
      {canResume && (
        <button
          className="resume-session"
          disabled={disabled}
          onClick={onResume}
        >
          {t("继续上次对话", "Resume previous conversation")} →
        </button>
      )}
    </main>
  );
}
