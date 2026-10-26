import type { Language, RewriteStyle, RewriteSuggestion } from "../lib/types";
import { useState } from "react";
import { BookOpen, Check } from "lucide-react";

/** Word-level LCS: keep shared words quiet, highlight only substitutions/insertions. */
export function changedWords(original: string, corrected: string) {
  const a = original.split(/(\s+)/),
    b = corrected.split(/(\s+)/);
  const rows = Array.from(
    { length: a.length + 1 },
    () => new Uint16Array(b.length + 1),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      rows[i][j] =
        a[i] === b[j]
          ? rows[i + 1][j + 1] + 1
          : Math.max(rows[i + 1][j], rows[i][j + 1]);
  const sharedA = new Set<number>(),
    sharedB = new Set<number>();
  let i = 0,
    j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      sharedA.add(i++);
      sharedB.add(j++);
    } else if (rows[i + 1][j] >= rows[i][j + 1]) i++;
    else j++;
  }
  return {
    original: a.map((text, index) => ({
      text,
      changed: !sharedA.has(index) && !!text.trim(),
    })),
    corrected: b.map((text, index) => ({
      text,
      changed: !sharedB.has(index) && !!text.trim(),
    })),
  };
}
export function CorrectionCard({
  language = "zh",
  original,
  corrected,
  explanation,
  saved,
  onSave,
  onRewrite,
}: {
  language?: Language;
  original: string;
  corrected: string;
  explanation: string;
  saved: boolean;
  onSave: () => void;
  onRewrite?: (original: string, style: RewriteStyle, language: Language) => Promise<RewriteSuggestion>;
}) {
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const words = changedWords(original, corrected || original);
  const hasCorrection = Boolean(correction?.trim());
  const [style, setStyle] = useState<"correction" | RewriteStyle>("correction");
  const [alternatives, setAlternatives] = useState<Record<string, RewriteSuggestion>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const key = language + ":" + style + ":" + original;

  async function selectStyle(next: "correction" | RewriteStyle) {
    setStyle(next);
    setError(false);
    if (next === "correction" || !onRewrite) return;
    const cacheKey = language + ":" + next + ":" + original;
    if (alternatives[cacheKey]) return;
    setLoading(true);
    try {
      const result = await onRewrite(original, next, language);
      setAlternatives((previous) => ({ ...previous, [cacheKey]: result }));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="correction-card" aria-label={t("表达改进", "Improve your expression")}>
      <div className="correction-modes" role="group" aria-label={t("表达风格", "Expression style")}>
        <button type="button" aria-pressed={style === "correction"}
          onClick={() => void selectStyle("correction")}>
          {t("纠正错误", "Correct errors")}
        </button>
        <button type="button" aria-pressed={style === "polite"}
          onClick={() => void selectStyle("polite")}>
          {t("更礼貌", "More polite")}
        </button>
        <button type="button" aria-pressed={style === "local"}
          onClick={() => void selectStyle("local")}>
          {t("更本土地道", "Natural local French")}
        </button>
      </div>
      {style === "correction" ? (
        <>
          {hasCorrection ? (
            <>
              <div>
                <span>{t("原句（标出需要修改的部分）", "Your sentence (errors marked)")}</span>
                <p lang="fr" className="correction-source">
                  {words.original.map((w, index) => w.changed
                    ? <del key={index}>{w.text}</del> : w.text)}
                </p>
              </div>
              {corrected && (
                <div>
                  <span>{t("正确表达", "Correct expression")}</span>
                  <p lang="fr">{words.corrected.map((w, index) =>
                    w.changed ? <mark key={index}>{w.text}</mark> : w.text)}</p>
                </div>
              )}
              <p className="correction-explanation">{explanation}</p>
              <button className="text-button" disabled={saved} onClick={onSave}>
                {saved ? <Check size={15} /> : <BookOpen size={15} />}
                {saved ? t("已收进笔记本", "Saved to notebook")
                  : t("收进笔记本", "Save to notebook")}
              </button>
            </>
          ) : (
            <p className="correction-explanation">
              {t("这句话没有发现需要修改的明显错误。也可以试试另外两种表达风格。",
                "No clear error found. You can still try another register.")}
            </p>
          )}
        </>
      ) : (
        <div className="expression-alternative" aria-live="polite">
          <span>{style === "polite"
            ? t("更礼貌、得体的表达", "Polite, tactful French")
            : t("法国年轻人的自然口语", "Natural French among young adults")}</span>
          {loading && !alternatives[key] && (
            <p>{t("正在生成表达…", "Generating an expression…")}</p>
          )}
          {error && !alternatives[key] && (
            <button type="button" onClick={() => void selectStyle(style)}>
              {t("生成失败，点击重试", "Generation failed. Tap to retry")}
            </button>
          )}
          {alternatives[key] && (
            <>
              <p lang="fr" className="alternative-expression">{alternatives[key].expression}</p>
              <p className="correction-explanation">{alternatives[key].explanation}</p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}
