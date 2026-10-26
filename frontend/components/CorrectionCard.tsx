import type { Language, RewriteStyle, RewriteSuggestion } from "../lib/types";
import { SlangGuide } from "./SlangGuide";
import { useEffect, useState, useId } from "react";
import {
  BookOpen,
  Check,
  ChevronUp,
  ChevronRight,
  MessageCircle,
  Users,
} from "lucide-react";

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
  onClose,
  canSave = true,
  onExplain,
}: {
  language?: Language;
  original: string;
  corrected: string;
  explanation: string;
  saved: boolean;
  onSave: () => void;
  canSave?: boolean;
  onExplain?: (text: string, language: Language) => Promise<string>;
  onClose?: () => void;
  onRewrite?: (
    original: string,
    style: RewriteStyle,
    language: Language,
  ) => Promise<RewriteSuggestion>;
}) {
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const id = useId();
  const words = changedWords(original, corrected || original);
  const hasCorrection = Boolean(explanation?.trim());
  const needsLocalization =
    hasCorrection &&
    (language === "en"
      ? /[\u4e00-\u9fff]/.test(explanation)
      : !/[\u4e00-\u9fff]/.test(explanation));
  const [localized, setLocalized] = useState<{
    key: string;
    text: string;
  } | null>(null);
  const [explanationFailed, setExplanationFailed] = useState(false);
  const [explanationRetry, setExplanationRetry] = useState(0);
  const explanationKey = `${language}:${explanation}`;
  useEffect(() => {
    if (!needsLocalization || !onExplain || localized?.key === explanationKey)
      return;
    let active = true;
    setExplanationFailed(false);
    onExplain(explanation, language)
      .then((text) => {
        if (active) setLocalized({ key: explanationKey, text });
      })
      .catch(() => {
        if (active) setExplanationFailed(true);
      });
    return () => {
      active = false;
    };
  }, [
    needsLocalization,
    onExplain,
    localized?.key,
    explanationKey,
    explanation,
    language,
    explanationRetry,
  ]);

  const [style, setStyle] = useState<RewriteStyle | null>(null);
  const [alternatives, setAlternatives] = useState<
    Record<string, RewriteSuggestion>
  >({});
  const [pending, setPending] = useState("");
  const [failed, setFailed] = useState("");
  const [retry, setRetry] = useState(0);
  const rewriteText = style === "slang" ? corrected || original : original;
  const key = language + ":" + style + ":" + rewriteText;
  const alternative = alternatives[key];
  useEffect(() => {
    if (!style || !onRewrite || alternative) return;
    let active = true;
    setPending(key);
    setFailed("");
    onRewrite(rewriteText, style, language)
      .then((value) => {
        if (active)
          setAlternatives((previous) => ({ ...previous, [key]: value }));
      })
      .catch(() => {
        if (active) setFailed(key);
      })
      .finally(() => {
        if (active) setPending("");
      });
    return () => {
      active = false;
    };
  }, [style, onRewrite, alternative, key, rewriteText, language, retry]);
  const modes = [
    { value: "polite", label: t("更礼貌", "More polite"), icon: MessageCircle },
    { value: "slang", label: t("俚语", "Slang"), icon: Users },
  ] as const;
  return (
    <aside
      className="correction-card hierarchy-a"
      aria-label={t("本轮纠错", "Turn correction")}
    >
      <header className="learning-card-heading">
        <strong>
          {hasCorrection
            ? t("更正后的表达", "Corrected expression")
            : t("表达练习", "Expression practice")}
        </strong>
        {onClose && (
          <button
            type="button"
            aria-label={t("收起学习卡", "Close learning card")}
            onClick={onClose}
          >
            <ChevronUp size={18} />
          </button>
        )}
      </header>
      <section
        className="primary-feedback"
        aria-label={t("纠错解释", "Correction explanation")}
      >
        {hasCorrection ? (
          <>
            {corrected && (
              <div>
                <span className="sr-only">
                  {t("更自然的说法", "A more natural expression")}
                </span>
                <p lang="fr">
                  {words.corrected.map((word, index) =>
                    word.changed ? (
                      <mark key={index}>{word.text}</mark>
                    ) : (
                      word.text
                    ),
                  )}
                </p>
              </div>
            )}
            {needsLocalization &&
            onExplain &&
            localized?.key !== explanationKey ? (
              explanationFailed ? (
                <button
                  onClick={() => setExplanationRetry((value) => value + 1)}
                >
                  {t(
                    "解释翻译失败，点击重试",
                    "Explanation translation failed. Retry",
                  )}
                </button>
              ) : (
                <p className="correction-explanation" role="status">
                  {t("正在翻译解释…", "Translating explanation…")}
                </p>
              )
            ) : (
              <p className="correction-explanation">
                {localized?.key === explanationKey
                  ? localized.text
                  : explanation}
              </p>
            )}
            <details className="learning-original">
              <summary>{t("你说的", "You said")}</summary>
              <p lang="fr" className="correction-source">
                {words.original.map((word, index) =>
                  word.changed ? <del key={index}>{word.text}</del> : word.text,
                )}
              </p>
            </details>
            {canSave && (
              <button className="text-button" disabled={saved} onClick={onSave}>
                {saved ? <Check size={15} /> : <BookOpen size={15} />}
                {saved
                  ? t("已收进笔记本", "Saved to notebook")
                  : t("收进笔记本", "Save to notebook")}
              </button>
            )}
          </>
        ) : (
          <p className="correction-explanation">
            {t(
              "本轮没有提供纠错反馈。你可以按需探索其他表达方式。",
              "No correction was provided for this turn. You can explore other ways to say it.",
            )}
          </p>
        )}
      </section>
      <section
        className="expression-exploration"
        aria-label={t("换一种表达", "Explore another expression")}
      >
        <h3>{t("换一种表达", "Explore another expression")}</h3>
        <div className="exploration-actions">
          {modes.map((mode) => (
            <button
              key={mode.value}
              type="button"
              aria-expanded={style === mode.value}
              aria-controls={
                style === mode.value ? `${id}-alternative` : undefined
              }
              onClick={() =>
                setStyle((current) =>
                  current === mode.value ? null : mode.value,
                )
              }
            >
              <mode.icon size={16} aria-hidden="true" />
              <span>{mode.label}</span>
              <ChevronRight size={15} aria-hidden="true" />
            </button>
          ))}
        </div>
        {style && (
          <div
            className="expression-alternative"
            role="region"
            id={`${id}-alternative`}
            aria-label={
              style === "polite"
                ? t("更礼貌的表达", "Polite alternative")
                : t("俚语表达", "Slang alternative")
            }
            aria-live="polite"
            aria-busy={pending === key && !alternative && failed !== key}
          >
            {style === "slang" && (
              <p className="slang-context">
                {t(
                  "俚语 / verlan · 按语境使用，不强行替换",
                  "Argot / verlan · context matters; no forced rewrites",
                )}
              </p>
            )}
            {alternative ? (
              <>
                <p lang="fr" className="alternative-expression">
                  {alternative.expression}
                </p>
                <p className="correction-explanation">
                  {alternative.explanation}
                </p>
              </>
            ) : !onRewrite ? (
              <p>
                {t(
                  "当前模式未配置表达改写。",
                  "Rewriting is unavailable in this view.",
                )}
              </p>
            ) : failed === key ? (
              <button
                type="button"
                onClick={() => setRetry((value) => value + 1)}
              >
                {t("生成失败，点击重试", "Generation failed. Tap to retry")}
              </button>
            ) : (
              <p>{t("正在生成表达…", "Generating an expression…")}</p>
            )}
            {style === "slang" && <SlangGuide language={language} />}
          </div>
        )}
      </section>
    </aside>
  );
}
