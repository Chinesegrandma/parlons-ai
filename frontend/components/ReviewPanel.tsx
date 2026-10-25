import { CheckCircle2, Sparkles, X } from "lucide-react";
import type { Language, Review } from "../lib/types";
export function ReviewPanel({
  review,
  language,
  loading,
  error,
  onClose,
}: {
  review: Review | null;
  language: Language;
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  return (
    <section
      className="session-review"
      aria-label={t("对话总结", "Conversation review")}
    >
      <header>
        <div>
          <span className="eyebrow">UN PAS DE PLUS</span>
          <h2>
            {t(
              "每一次开口，都值得回看。",
              "Every conversation is a step forward.",
            )}
          </h2>
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
      {error && <p role="alert">{error}</p>}
      {review && (
        <>
          <p className="review-intro">{review.summary}</p>
          <h3>
            <CheckCircle2 size={18} />
            {t("你做得好的地方", "What you did well")}
          </h3>
          {!review.strengths.length && (
            <p>
              {t(
                "目前还没有足够证据给出具体优点，继续练习会让反馈更有依据。",
                "There is not enough evidence for specific strengths yet.",
              )}
            </p>
          )}
          {review.strengths.map((item, i) => (
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
          {review.corrections.map((item, i) => (
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
        </>
      )}
      <small>
        {t(
          "总结依据文字与转写内容，可能有遗漏，不包含发音评分。",
          "Based on text and transcripts; may miss issues and does not assess pronunciation.",
        )}
      </small>
    </section>
  );
}
