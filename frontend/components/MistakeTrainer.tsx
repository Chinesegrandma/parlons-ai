import { useState } from "react";
import { categories, questionsFor, type Mistake } from "../lib/mistakes";
import type { Language, MistakeCategory } from "../lib/types";

export function MistakeTrainer({ language, mistakes, onRemove }: {
  language: Language;
  mistakes: Mistake[];
  onRemove: (id: string) => void;
}) {
  const t = (zh: string, en: string) => language === "en" ? en : zh;
  const [category, setCategory] = useState<MistakeCategory | null>(null);
  const [quiz, setQuiz] = useState(false);
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const questions = category ? questionsFor(category, mistakes) : [];
  const question = questions[index];
  const select = (value: MistakeCategory | null) => {
    setCategory(value);
    setQuiz(false);
    setIndex(0);
    setChoice(null);
    setCorrect(0);
  };
  if (!category) return (
    <section className="mistake-trainer">
      <h2>{t("我的法语弱点", "My French mistakes")}</h2>
      <p>{t("每个纠错建议单独归类。选择一类开始专项练习。", "Each correction is grouped separately. Choose a category to practice.")}</p>
      <div className="mistake-grid">
        {categories.map((entry) => (
          <button className="notebook-entry" key={entry.id} onClick={() => select(entry.id)}>
            <strong>{entry[language]}</strong>
            <small>{mistakes.filter((item) => item.category === entry.id).length} {t("条记录", "mistakes")}</small>
          </button>
        ))}
      </div>
    </section>
  );
  return (
    <section className="mistake-trainer">
      <button className="back-scenes" onClick={() => select(null)}>← {t("所有分类", "All categories")}</button>
      <h2>{categories.find((entry) => entry.id === category)?.[language]}</h2>
      {!quiz ? (
        <>
          <button className="end-review" disabled={!questions.length} onClick={() => { setQuiz(true); setIndex(0); setChoice(null); setCorrect(0); }}>
            {t("开始专项选择题", "Start targeted quiz")} · {questions.length}
          </button>
          {mistakes.filter((item) => item.category === category).map((item) => (
            <article className="notebook-entry" key={item.id}>
              <small lang="fr">{item.context}</small>
              <p lang="fr">{item.original} → <strong>{item.suggestion}</strong></p>
              <p>{item.explanation}</p>
              <button onClick={() => onRemove(item.id)}>{t("移除此建议", "Dismiss suggestion")}</button>
            </article>
          ))}
        </>
      ) : question ? (
        <article className="notebook-entry mistake-question">
          <small>{index + 1} / {questions.length} · {question.personal ? t("来自你的 AI 纠错建议", "From your AI correction") : t("专项例题", "Practice example")}</small>
          <h3 lang="fr">{question.prompt}</h3>
          {question.options.map((option, i) => (
            <button key={i} aria-pressed={choice === i} disabled={choice !== null} onClick={() => {
              setChoice(i);
              if (i === question.answer) setCorrect((value) => value + 1);
            }}>{option}</button>
          ))}
          {choice !== null && (
            <>
              <p role="status">{choice === question.answer ? t("正确！", "Correct!") : t("参考答案：", "Suggested answer:")} {question.options[question.answer]}</p>
              <p>{question[language]}</p>
              <button className="end-review" onClick={() => { setIndex(index + 1); setChoice(null); }}>{t("下一题", "Next question")} →</button>
            </>
          )}
        </article>
      ) : (
        <article className="notebook-entry">
          <h3>{t("练习完成", "Practice complete")}</h3>
          <p>{correct} / {questions.length}</p>
          <button onClick={() => select(category)}>{t("返回分类", "Back to category")}</button>
        </article>
      )}
      <small>{t("AI 纠错可能有误；选择题不是正式能力评估。", "AI suggestions may be wrong; quizzes are not a formal assessment.")}</small>
    </section>
  );
}
