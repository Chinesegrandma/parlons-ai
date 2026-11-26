import { CheckCircle2, Sparkles, X } from "lucide-react";
import { useState } from "react";
import type { Language, Review } from "../lib/types";
export function ReviewPanel({
  review,
  language,
  loading,
  error,
  onClose,
  onHome,
  onRetry,
  onPractice,
  turns = 0,
  spokenTurns = 0,
  onRecall,
}: {
  onRecall?: (remembered:boolean)=>void;
  onHome?: () => void;
  onRetry?: () => void;
  onPractice?: () => void;
  turns?: number;
  spokenTurns?: number;
  review: Review | null;
  language: Language;
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const [showAll,setShowAll] = useState(false);
  return (
    <section
      className="session-review"
      aria-label={t("对话总结", "Conversation review")}
    >
      <header>
        <div>
          <h2>{review ? "Bravo !" : t("对话总结","Conversation review")}</h2>
        </div>
        <button onClick={onClose} aria-label={t("关闭总结", "Close review")}>
          <X size={18} />
        </button>
      </header>
      {loading && (
        <p role="status">
          {t(
            "正在回顾本轮对话中的表达…",
            "Reviewing the expressions from this conversation…",
          )}
        </p>
      )}
      {error && <div role="alert">{error}{onRetry && <button className="end-review" onClick={onRetry}>{t("重试","Retry")}</button>}</div>}
      {review && (
        <>
          <div className="study-stats"><div><strong>{turns}</strong><small>{t("表达次数","Turns")}</small></div><div><strong>{spokenTurns}</strong><small>{t("语音表达","Spoken turns")}</small></div><div><strong>{review.corrections.length}</strong><small>{t("待复习","Corrections")}</small></div></div>
          <p className="review-intro">{review.summary}</p>
          {!!review.goal_results?.length && <section className="goal-outcomes"><h3>{t("你完成的任务","What you accomplished")}</h3>{review.goal_results.map((g,i)=><div key={i}><strong>{g.goal}</strong><p lang="fr">{g.quote}</p></div>)}</section>}
          <h3>
            <CheckCircle2 size={18} />
            {t("你做得好的地方", "What you did well")}
          </h3>
          {!review.strengths.length && <p>{t("暂无具体反馈。","No specific feedback yet.")}</p>}
          {review.strengths.slice(0, showAll ? undefined : 2).map((item, i) => (
            <article className="review-strength" key={i}>
              <blockquote lang="fr">{item.quote}</blockquote>
              <p>{item.reason}</p>
            </article>
          ))}
          <h3>
            <Sparkles size={18} />
            {t("可以改进的表达", "Expressions to improve")}
          </h3>
          {!review.corrections.length && (
            <p>
              {t(
                "这次没有识别出需要纠正的表达；这不代表已经验证没有任何错误。",
                "No corrections were identified. This does not guarantee that every expression was error-free.",
              )}
            </p>
          )}
          {review.corrections.slice(0, showAll ? undefined : 3).map((item, i) => (
            <article className="review-correction" key={i}>
              <div>
                <span>{t("你说的", "You said")}</span>
                <p lang="fr">{item.original}</p>
              </div>
              <div>
                <span>{t("可以这样说", "Try this")}</span>
                <p lang="fr">{item.suggestion}</p>
              </div>
              <p>{item.explanation}</p>
            </article>
          ))}
          {(review.corrections.length>3 || review.strengths.length>2) && <button className="text-button" onClick={()=>setShowAll(!showAll)}>{showAll?t("收起","Show less"):t("查看完整反馈","Full feedback")}</button>}
          {onRecall && <div className="review-next-actions"><h3>{t("这次能独立说出来吗？","Could you say it independently?")}</h3><div className="notebook-actions"><button onClick={()=>onRecall(false)}>{t("还需练习","Keep practicing")}</button><button onClick={()=>onRecall(true)}>{t("记住了","Remembered")}</button></div></div>}
          <div className="review-next-actions">
            {onPractice && <button className="daily-main" onClick={onPractice}>{t("再练一次","Practice again")} →</button>}
            {onHome && <button className="text-button" onClick={onHome}>{t("返回首页","Home")}</button>}
          </div>
        </>
      )}
      <small>
        {t(
          "基于文字与转写，不含发音评分。",
          "Based on text and transcripts; may miss issues and does not assess pronunciation.",
        )}
      </small>
    </section>
  );
}
