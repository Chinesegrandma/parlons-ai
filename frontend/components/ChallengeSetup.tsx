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
  const [custom, setCustom] = useState(false);
  const [target, setTarget] = useState("");
  const [savedTargets, setSavedTargets] = useState<string[]>(() => {
    try {
      const value: unknown = JSON.parse(
        localStorage.getItem("parlons-guessing-words") || "[]",
      );
      return Array.isArray(value)
        ? value
            .filter(
              (word): word is string =>
                typeof word === "string" && !!word.trim() && word.length <= 100,
            )
            .slice(0, 100)
        : [];
    } catch {
      return [];
    }
  });
  const [saveError, setSaveError] = useState(false);
  const [category, setCategory] = useState("all");
  function saveWords(words: string[]) {
    setSavedTargets(words);
    try {
      localStorage.setItem("parlons-guessing-words", JSON.stringify(words));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }
  const categories = [
    ["all", "全部", "All"],
    ["home", "家居", "Home"],
    ["food", "饮食", "Food"],
    ["travel", "出行与生活", "Travel & daily life"],
    ["nature", "自然", "Nature"],
    ["people", "人物与职业", "People & jobs"],
    ["ideas", "概念与经历", "Ideas & experiences"],
  ];
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
            challenge: {
              seed,
              side,
              timer_seconds: timer ? 60 : 0,
              ...(custom && topic === "challenge_describe"
                ? { custom_target: target.trim() }
                : {}),
            },
          });
        }}
      >
        {topic === "challenge_describe" && (
          <>
            <label>
              {t("词条来源", "Word source")}
              <select
                value={custom ? "custom" : "library"}
                onChange={(event) => setCustom(event.target.value === "custom")}
              >
                <option value="library">
                  {t(
                    `内置题库（${definition.seeds.length} 词）`,
                    `Word library (${definition.seeds.length} words)`,
                  )}
                </option>
                <option value="custom">{t("自己补充", "Add your own")}</option>
              </select>
            </label>
            {!custom && (
              <label>
                {t("词条分类", "Word category")}
                <select
                  value={category}
                  onChange={(event) => {
                    const next = event.target.value;
                    setCategory(next);
                    setSeed(
                      Math.max(
                        0,
                        definition.seeds.findIndex(
                          (item) =>
                            next === "all" ||
                            ("category" in item && item.category === next),
                        ),
                      ),
                    );
                  }}
                >
                  {categories.map(([value, zh, en]) => (
                    <option key={value} value={value}>
                      {t(zh, en)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {custom && (
              <div className="custom-target">
                <label>
                  {t(
                    "你的法语目标词或短语",
                    "Your French target word or phrase",
                  )}
                  <input
                    required
                    maxLength={100}
                    value={target}
                    onChange={(event) => setTarget(event.target.value)}
                    placeholder="un accordéon"
                  />
                </label>
                <p>
                  {t(
                    "只向你显示，不把答案交给 Camille。请用法语描述它。",
                    "Only you see the answer; Camille receives your clues. Describe it in French.",
                  )}
                </p>
                <button
                  type="button"
                  disabled={
                    !target.trim() ||
                    savedTargets.includes(target.trim()) ||
                    savedTargets.length >= 100
                  }
                  onClick={() => saveWords([...savedTargets, target.trim()])}
                >
                  {t("保存到我的词库", "Save to my words")}
                </button>
                <p className="challenge-note">
                  {t(
                    "词库保存在当前浏览器；更换设备或隧道网址后不会自动同步。最多保存 100 条。",
                    "Saved in this browser only, up to 100 entries. Other devices or tunnel addresses do not share this list.",
                  )}
                </p>
                {saveError && (
                  <p role="status">
                    {t(
                      "浏览器无法保存，当前页面仍可使用。",
                      "Browser storage is unavailable; you can still play on this page.",
                    )}
                  </p>
                )}
                {savedTargets.length > 0 && (
                  <ul className="saved-targets">
                    {savedTargets.map((word) => (
                      <li key={word}>
                        <button type="button" onClick={() => setTarget(word)}>
                          {word}
                        </button>
                        <button
                          type="button"
                          aria-label={t(`删除 ${word}`, `Remove ${word}`)}
                          onClick={() =>
                            saveWords(
                              savedTargets.filter((value) => value !== word),
                            )
                          }
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
        {!custom && (
          <>
            <label>
              {topic === "challenge_describe"
                ? t("选择目标词", "Choose a target word")
                : t("选择题目", "Choose a prompt")}
              <select
                value={seed}
                onChange={(event) => setSeed(Number(event.target.value))}
              >
                {definition.seeds.map(
                  (item, index) =>
                    (category === "all" ||
                      !("category" in item) ||
                      item.category === category) && (
                      <option key={index} value={index}>
                        {item[language]}
                      </option>
                    ),
                )}
              </select>
            </label>
            <button
              type="button"
              className="text-button"
              onClick={() =>
                setSeed((value) => {
                  const choices = definition.seeds
                    .map((item, index) => ({ item, index }))
                    .filter(
                      ({ item }) =>
                        category === "all" ||
                        !("category" in item) ||
                        item.category === category,
                    );
                  return choices[
                    (choices.findIndex((item) => item.index === value) + 1) %
                      choices.length
                  ].index;
                })
              }
            >
              <Shuffle size={16} />
              {t("换一个", "Try another")}
            </button>
          </>
        )}
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
        <button
          type="submit"
          className="challenge-start"
          disabled={disabled || (custom && !target.trim())}
        >
          {t("开始挑战", "Start challenge")} →
        </button>
      </form>
    </section>
  );
}
