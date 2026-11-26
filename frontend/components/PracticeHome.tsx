import { useEffect, useRef, useState } from "react";
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
import { sceneVariants } from "../lib/scene-variants";
import { dailyLesson, localDay, practiceStreak, type Notebook, type Memory } from "../lib/learning";
import type { Language, Topic, PracticeOptions } from "../lib/types";
const sections = [
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
  {
    id: "challenge",
    zh: "表达挑战",
    en: "Expression challenges",
    subZh: "观点、猜词、故事与辩论，换一种方式开口",
    subEn: "Opinions, guessing, stories and debate",
    icon: Sparkles,
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
  book,
  onReview,
  onStudy,
}: {
  language: Language;
  onStart: (topic: Topic, options?: Partial<PracticeOptions>) => void;
  level?: PracticeOptions["level"];
  disabled: boolean;
  onResume: () => void;
  canResume?: boolean;
  onCustom?: (text: string) => void;
  book?: Notebook;
  onReview?: (card: Memory) => void;
  onStudy?: () => void;
}) {
  const [selected, setSelected] = useState<Topic | null>(null);
  const [custom, setCustom] = useState("");
  const [category, setCategory] = useState("");
  const [group, setGroup] = useState("");
  const mainRef = useRef<HTMLElement>(null);
  const previousView = useRef("");
  useEffect(() => {
    const view = `${category}:${group}:${selected ?? ""}`;
    if (previousView.current && previousView.current !== view) {
      window.scrollTo?.(0, 0);
      mainRef.current?.focus({ preventScroll: true });
    }
    previousView.current = view;
  }, [category, group, selected]);
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const history = book?.practiceHistory || [];
  const today = history.some(r => r.day === localDay());
  const lesson = dailyLesson(history);
  const due = (book?.cards || []).filter(c => c.due <= Date.now() && (c.corrected || c.sent));
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
      <main ref={mainRef} tabIndex={-1} className="practice-home scene-selection">
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
      ref={mainRef}
      tabIndex={-1}
      className={`practice-home ${category ? "scene-selection" : ""} ${category === "challenge" ? "challenge-home" : ""}`}
    >
      {!category && (
        <>
          <div className="home-intro">
            <h1 lang="fr">On parle ?</h1>
            <p>
              {t(
                "从学会法语，到用法语生活。",
                "From learning French to living in French.",
              )}
            </p>
          </div>
          {book && (
            <section className="daily-practice" aria-label={t("今日练习", "Daily practice")}>
              <div className="daily-heading"><span>{t("今日练习", "Daily practice")}</span><small>{today ? t("今天已练习", "Practiced today") : t("每天一点", "A little every day")}{practiceStreak(history) > 0 ? t(" · 连续 ", " · Streak ") + practiceStreak(history) + t(" 天", " days") : ""}</small></div>
              <button className="daily-main" disabled={disabled} onClick={() => onStart(lesson.topic, {scene: language === "zh" ? lesson.title : lesson.titleEn, situation: lesson.situation, opening: lesson.opening, goals: language === "zh" ? lesson.goals : lesson.goalsEn,})}>
                <span><strong>{language === "zh" ? lesson.title : lesson.titleEn}</strong><small>{t("约 ", "About ")}{lesson.minutes}{t(" 分钟", " min")}</small></span><ArrowUpRight size={20}/>
              </button>
              {due.length > 0 && onReview && <button className="daily-secondary" disabled={disabled} onClick={() => onReview(due[0])}>{t("复习 ", "Review ")}{due.length}{t(" 个表达", " expressions")} <ArrowUpRight size={15}/></button>}
              {onStudy && <button className="daily-secondary" onClick={onStudy}>{t("我的学习", "My learning")} <ArrowUpRight size={15}/></button>}
            </section>
          )}
          {canResume && <button className="resume-session" disabled={disabled} onClick={onResume}>{t("继续上次对话", "Resume previous conversation")} →</button>}
          <button
            type="button"
            className="home-quick free-chat-entry"
            aria-label={t("自由聊天", "Free chat")}
            disabled={disabled}
            onClick={() => onStart("daily")}
          >
            <span className="free-chat-icon" aria-hidden="true">✦</span>
            <span className="free-chat-copy">
              <strong>{t("自由聊天", "Free chat")}</strong>
              <small>{t("想聊什么，就聊什么。", "Talk about anything.")}</small>
            </span>
            <ArrowUpRight size={20} aria-hidden="true" />
          </button>
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
          </div>
          <div className="subscene-grid">
            {!group &&
              grouped.map((id) => (
                <button
                  className="subscene-card"
                  key={id}
                  aria-label={`${groups[id as keyof typeof groups][language === "en" ? 1 : 0]} ${t("查看具体事项", "Choose a situation")}`}
                  onClick={() => setGroup(id)}
                >
                  <span>
                    {
                      groups[id as keyof typeof groups][
                        language === "en" ? 1 : 0
                      ]
                    }
                  </span>

                  <ArrowUpRight size={18} />
                </button>
              ))}
            {available
              .filter((scene) => group || !scene.group)
              .map((scene) => (
                <button
                  className="subscene-card"
                  key={scene.id}
                  aria-label={scene.category === "challenge" ? undefined : `${scene[language]} ${t("进入对话", "Enter conversation")}`}
                  disabled={disabled}
                  onClick={() =>
                    scene.category === "challenge"
                      ? setSelected(scene.id)
                      : onStart(scene.id)
                  }
                >
                  <span>{scene[language]}</span>
                  {scene.category === "challenge" && <small>{language === "en" ? challengeFor(scene.id)?.descriptionEn : challengeFor(scene.id)?.descriptionZh}</small>}
                  <ArrowUpRight size={18} />
                </button>
              ))}
            {!group && sceneVariants.filter(v=>v.category===category).map(v=>(<button key={v.zh} className="subscene-card" disabled={disabled} onClick={()=>onStart(v.topic,{scene:v[language],situation:v.situation,opening:v.opening,goals:language==="zh"?v.goals:[]})}><span>{v[language]}</span><ArrowUpRight size={18}/></button>))}
          </div>

        </>
      ) : (
        <div className="category-grid">
          {sections.map(({ icon: Icon, ...section }) => (
            <button
              aria-label={section[language]}
              className={`category-card category-${section.id}`}
              key={section.id}
              disabled={disabled}
              onClick={() => setCategory(section.id)}
            >
              <div>
                <span className="category-icon">
                  <Icon size={25} />
                </span>

              </div>
              <h2>{section[language]}</h2>
              <p>{section[language === "en" ? "subEn" : "subZh"]}</p>
              <span className="category-footer">
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
    </main>
  );
}
