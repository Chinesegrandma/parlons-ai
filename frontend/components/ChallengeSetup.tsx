import { useState } from "react";
import { ArrowLeft, Shuffle } from "lucide-react";
import { challengeFor } from "../lib/challenges";
import type { Language, Topic, PracticeOptions } from "../lib/types";
export function ChallengeSetup({
  topic,
  language,
  initialLevel = "B1-B2",
  disabled,
  onBack,
  onStart,
}: {
  topic: Topic;
  language: Language;
  initialLevel?: PracticeOptions["level"];
  disabled: boolean;
  onBack: () => void;
  onStart: (topic: Topic, options: Partial<PracticeOptions>) => void;
}) {
  const definition = challengeFor(topic)!;
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const [seed, setSeed] = useState(0);
  const [level, setLevel] = useState(initialLevel);
  const [side, setSide] = useState<"for" | "against">("for");
  const [timer, setTimer] = useState(false);
  return (
    <section
      className="challenge-setup"
      aria-label={t("设置表达挑战", "Set up expression challenge")}
    >
      <button className="back-scenes" onClick={onBack}>
        <ArrowLeft size={17} />
        {t("返回挑战", "Back to challenges")}
      </button>
      <p className="eyebrow">PARLONS · CHALLENGE</p>
      <h1>{definition[language]}</h1>
      <p>{language === "en" ? definition.howEn : definition.howZh}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onStart(topic, {
            level,
            challenge: { seed, side, timer_seconds: timer ? 60 : 0 },
          });
        }}
      >
        <label>
          {topic === "challenge_describe"
            ? t("选择目标词", "Choose a target word")
            : t("选择题目", "Choose a prompt")}
          <select
            value={seed}
            onChange={(event) => setSeed(Number(event.target.value))}
          >
            {definition.seeds.map((item, index) => (
              <option key={index} value={index}>
                {item[language]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="text-button"
          onClick={() =>
            setSeed((value) => (value + 1) % definition.seeds.length)
          }
        >
          <Shuffle size={16} />
          {t("换一个", "Try another")}
        </button>
        <label>
          {t("本次难度", "Challenge difficulty")}
          <select
            value={level}
            onChange={(event) =>
              setLevel(event.target.value as PracticeOptions["level"])
            }
          >
            <option value="A1-A2">
              {t("入门 · 更多提示（A1–A2）", "Starter · more support (A1–A2)")}
            </option>
            <option value="B1-B2">
              {t("熟练 · 独立表达（B1–B2）", "Independent expression (B1–B2)")}
            </option>
            <option value="C1">
              {t(
                "进阶 · 细节与回应（C1）",
                "Advanced · nuance and response (C1)",
              )}
            </option>
          </select>
        </label>
        {topic === "challenge_debate" && (
          <label>
            {t("你的立场", "Your side")}
            <select
              value={side}
              onChange={(event) =>
                setSide(event.target.value as "for" | "against")
              }
            >
              <option value="for">{t("支持", "For")}</option>
              <option value="against">{t("反对", "Against")}</option>
            </select>
          </label>
        )}
        {topic === "challenge_opinion" && (
          <label className="challenge-toggle">
            <span>
              {t("显示可暂停的一分钟计时", "Show a pausable one-minute timer")}
            </span>
            <input
              type="checkbox"
              checked={timer}
              onChange={(event) => setTimer(event.target.checked)}
            />
          </label>
        )}
        <p className="challenge-note">
          {t(
            "难度是练习设置，不是水平测评。可打字或说话，任何时候都可以结束并总结。",
            "Difficulty is a practice setting, not a proficiency assessment. Type or speak and finish for feedback whenever ready.",
          )}
        </p>
        <button type="submit" className="challenge-start" disabled={disabled}>
          {t("开始挑战", "Start challenge")} →
        </button>
      </form>
    </section>
  );
}
