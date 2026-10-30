import { WordLookup } from "./WordLookup";
import { TextActions } from "./TextActions";
import { AssistantAvatar, ASSISTANT_NAME } from "./AssistantAvatar";
import { CorrectionCard, changedWords } from "./CorrectionCard";
import { useEffect, useRef, useState, useId, type CSSProperties } from "react";
import {
  Sparkles,
  ChevronDown,
  Volume2,
  Gauge,
  Languages,
  Copy,
  Check,
} from "lucide-react";
import type {
  Message,
  Language,
  RewriteStyle,
  RewriteSuggestion,
} from "../lib/types";
export function MessageList({
  language = "zh",
  onSaveCorrection,
  savedCorrectionIds = [],
  hideCorrections = false,
  messages,
  busy,
  busyLabel = "正在准备回复…",
  speechReady,
  onSpeak,
  onTranslate,
  onRewrite,
  onLookup,
}: {
  onLookup?: (
    text: string,
    context: string,
    language: Language,
  ) => Promise<import("../lib/types").LookupResult>;
  language?: Language;
  onSaveCorrection?: (id: number) => void;
  savedCorrectionIds?: number[];
  hideCorrections?: boolean;
  messages: Message[];
  busy: boolean;
  busyLabel?: string;
  speechReady: boolean;
  onSpeak: (text: string, playbackRate?: 0.8 | 1) => void;
  onTranslate: (text: string, language: Language) => Promise<string>;
  onRewrite?: (
    text: string,
    style: RewriteStyle,
    language: Language,
  ) => Promise<RewriteSuggestion>;
}) {
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const bottom = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const [learningId, setLearningId] = useState<number | null>(null);
  const [wide, setWide] = useState(false);
  const explanationCache = useRef(new Map<string, Promise<string>>());
  const historyId = messages[0]?.id;
  useEffect(() => {
    setLearningId(null);
  }, [hideCorrections, historyId]);
  const rewriteCache = useRef(new Map<string, Promise<RewriteSuggestion>>());
  useEffect(() => {
    const media = window.matchMedia?.("(min-width: 1024px)");
    if (!media) return;
    const update = () => setWide(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);
  const selectedIndex = messages.findIndex(
    (item) => item.id === learningId && item.role === "user",
  );
  const selectedUser = messages[selectedIndex];
  const selectedFeedback = messages[selectedIndex + 1];
  const showLearning =
    !hideCorrections &&
    selectedIndex >= 0 &&
    feedbackBelongs(messages, selectedIndex);
  const selectedCard = showLearning ? (
    <CorrectionCard
      key={`${selectedUser.id}:${language}`}
      language={language}
      original={selectedUser.content}
      onSpeak={onSpeak}
      speechReady={speechReady}
      corrected={selectedFeedback.corrected_text || ""}
      explanation={selectedFeedback.correction || ""}
      saved={savedCorrectionIds.includes(selectedFeedback.id)}
      onSave={() => onSaveCorrection?.(selectedFeedback.id)}
      canSave={Boolean(onSaveCorrection)}
      onClose={() => setLearningId(null)}
      onExplain={(text, lang) => {
        const key = `${lang}:${text}`;
        let request = explanationCache.current.get(key);
        if (!request) {
          request = onTranslate(text, lang).catch((error) => {
            explanationCache.current.delete(key);
            throw error;
          });
          explanationCache.current.set(key, request);
        }
        return request;
      }}
      onRewrite={
        onRewrite
          ? (text, style, lang) => {
              const key = `${selectedUser.id}:${lang}:${style}:${text}`;
              let request = rewriteCache.current.get(key);
              if (!request) {
                request = onRewrite(text, style, lang).catch((error) => {
                  rewriteCache.current.delete(key);
                  throw error;
                });
                rewriteCache.current.set(key, request);
              }
              return request;
            }
          : undefined
      }
    />
  ) : null;

  const translationCache = useRef(new Map<string, string>());
  const [expanded, setExpanded] = useState<number[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loadingTranslation, setLoadingTranslation] = useState<string | null>(
    null,
  );
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  async function toggleTranslation(message: Message) {
    if (expanded.includes(message.id)) {
      setExpanded((ids) => ids.filter((id) => id !== message.id));
      return;
    }
    setExpanded((ids) => [...ids, message.id]);
    const key = language + ":" + message.id + ":" + message.content;
    if (translationCache.current.has(key)) return;
    setLoadingTranslation(key);
    setTranslationError(null);
    try {
      const translated = await onTranslate(message.content, language);
      translationCache.current.set(key, translated);
      setTranslations((old) => ({ ...old, [key]: translated }));
    } catch {
      setTranslationError(key);
    } finally {
      setLoadingTranslation((current) => (current === key ? null : current));
    }
  }
  async function copyReply(message: Message) {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopiedId(message.id);
    } catch {
      setCopiedId(null);
    }
  }
  useEffect(() => {
    bottom.current?.scrollIntoView?.({
      behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
      block: "nearest",
    });
  }, [messages, busy]);
  return (
    <WordLookup key={historyId} language={language} onLookup={onLookup}>
      <div
        className={`conversation-layout ${showLearning ? "has-learning" : ""}`}
      >
        <div
          className="conversation"
          aria-label="Conversation history"
          aria-live="polite"
        >
          <div className="conversation-date">
            <span />
            UNE NOUVELLE CONVERSATION
            <span />
          </div>
          {messages.map((message, index) => (
            <article
              className={`message ${message.role}`}
              key={message.id}
              style={
                {
                  "--message-stagger": `${Math.min(index, 4) * 50}ms`,
                } as CSSProperties
              }
            >
              <div className="avatar">
                {message.role === "assistant" ? (
                  <AssistantAvatar size={30} language={language} />
                ) : (
                  t("你", "You")
                )}
              </div>
              <div className="bubblewrap">
                <div className="message-author">
                  {message.role === "assistant"
                    ? t(
                        `${ASSISTANT_NAME} · 你的 AI 法语助理`,
                        `${ASSISTANT_NAME} · Your AI French assistant`,
                      )
                    : t("你", "You")}
                  <span>{message.role === "assistant" ? "FR" : "VOUS"}</span>
                </div>
                <div
                  className="bubble"
                  lang="fr"
                  data-lookup-text
                  tabIndex={0}
                  title={t(
                    "点词或拖选短语查义；键盘选中后按 Enter",
                    "Tap a word or select a phrase to look it up; select and press Enter on a keyboard",
                  )}
                >
                  {message.content}
                </div>
                {message.role === "assistant" && (
                  <div className="reply-actions">
                    <button
                      className="speak"
                      aria-label={t("朗读", "Listen")}
                      disabled={!speechReady}
                      onClick={() => onSpeak(message.content, 1)}
                    >
                      <Volume2 size={13} /> {t("听一遍", "Listen")}
                    </button>
                    <button
                      className="speak"
                      disabled={!speechReady}
                      aria-label={t("慢速朗读 0.8×", "Slow listen (0.8×)")}
                      title={t(
                        "以 0.8 倍速朗读这条回复",
                        "Play this reply at 0.8× speed",
                      )}
                      onClick={() => onSpeak(message.content, 0.8)}
                    >
                      <Gauge size={13} aria-hidden="true" /> 0.8×
                    </button>
                    <button
                      className="speak"
                      aria-expanded={expanded.includes(message.id)}
                      onClick={() => void toggleTranslation(message)}
                    >
                      <Languages size={13} />{" "}
                      {expanded.includes(message.id)
                        ? t("收起翻译", "Hide translation")
                        : t("翻译", "Translate")}
                    </button>
                    <button
                      className="speak"
                      onClick={() => void copyReply(message)}
                    >
                      {copiedId === message.id ? (
                        <Check size={13} />
                      ) : (
                        <Copy size={13} />
                      )}
                      {copiedId === message.id
                        ? t("已复制", "Copied")
                        : t("复制", "Copy")}
                    </button>
                    {expanded.includes(message.id) &&
                      (() => {
                        const key =
                          language + ":" + message.id + ":" + message.content;
                        return (
                          <div
                            className="reply-translation"
                            lang={language === "zh" ? "zh-CN" : "en"}
                          >
                            {translations[key] ||
                              translationCache.current.get(key) ||
                              (loadingTranslation === key ? (
                                t("正在翻译…", "Translating…")
                              ) : translationError === key ? (
                                <button
                                  onClick={() => {
                                    setExpanded((ids) =>
                                      ids.filter((id) => id !== message.id),
                                    );
                                    setTranslationError(null);
                                  }}
                                >
                                  {t(
                                    "翻译失败，点击收起后重试",
                                    "Translation failed. Close and retry.",
                                  )}
                                </button>
                              ) : (
                                t("正在准备翻译…", "Preparing translation…")
                              ))}
                          </div>
                        );
                      })()}
                  </div>
                )}
                {message.original_transcript != null && (
                  <details className="transcript-history">
                    <summary>
                      {t(
                        "查看原始转写与发送版本",
                        "View original transcript and sent version",
                      )}
                    </summary>
                    <p>
                      {t("原始：", "Original: ")}
                      {message.original_transcript}
                    </p>
                    <p>
                      {t("发送：", "Sent: ")}
                      {message.edited_transcript}
                    </p>
                  </details>
                )}
              </div>
              {!hideCorrections &&
                message.role === "user" &&
                feedbackBelongs(messages, index) && (
                  <div className="learner-feedback">
                    <button
                      className="learning-capsule"
                      aria-label={
                        messages[index + 1].corrected_text
                          ? `${t("查看解释和其他表达", "View explanation and alternatives")}: ${messages[index + 1].corrected_text}`
                          : undefined
                      }
                      aria-expanded={showLearning && learningId === message.id}
                      aria-controls={
                        showLearning && learningId === message.id
                          ? panelId
                          : undefined
                      }
                      onClick={(event) => {
                        if (
                          (event.target as HTMLElement).closest(
                            "[data-lookup-text]",
                          )
                        )
                          return;
                        setLearningId((current) =>
                          current === message.id ? null : message.id,
                        );
                      }}
                    >
                      <Sparkles size={14} aria-hidden="true" />
                      {messages[index + 1].corrected_text ? (
                        <span
                          className="correction-preview"
                          lang="fr"
                          data-lookup-text
                        >
                          {changedWords(
                            message.content,
                            messages[index + 1].corrected_text!,
                          ).corrected.map((word, wordIndex) =>
                            word.changed ? (
                              <mark key={wordIndex}>{word.text}</mark>
                            ) : (
                              word.text
                            ),
                          )}
                        </span>
                      ) : (
                        <span>
                          {messages[index + 1].correction
                            ? t("查看错误解释", "View explanation")
                            : t("表达选项 · 查看", "Expression options · View")}
                        </span>
                      )}
                      <ChevronDown size={15} aria-hidden="true" />
                    </button>
                    {messages[index + 1].corrected_text && (
                      <TextActions
                        key={messages[index + 1].id}
                        text={messages[index + 1].corrected_text!}
                        language={language}
                        speechReady={speechReady}
                        onSpeak={onSpeak}
                      />
                    )}
                    {!wide && showLearning && learningId === message.id && (
                      <div id={panelId} className="inline-learning">
                        {selectedCard}
                      </div>
                    )}
                  </div>
                )}
            </article>
          ))}
          {busy && (
            <div className="typing">
              <span />
              <span />
              <span />
              <small>{busyLabel}</small>
            </div>
          )}
          <div ref={bottom} />
        </div>
        {wide && showLearning && (
          <div id={panelId} className="learning-rail">
            {selectedCard}
          </div>
        )}
      </div>
    </WordLookup>
  );
}

function feedbackBelongs(messages: Message[], index: number) {
  const user = messages[index],
    reply = messages[index + 1];
  if (!user || user.role !== "user" || reply?.role !== "assistant")
    return false;
  if (reply.feedback_for != null) return reply.feedback_for === user.id;
  // Avoid displaying old, unbound feedback copied from a prior turn in existing databases.
  if (reply.corrected_text)
    for (let i = 1; i < index; i++) {
      if (
        messages[i].role === "assistant" &&
        messages[i].corrected_text === reply.corrected_text &&
        messages[i - 1].content !== user.content &&
        user.content !== reply.corrected_text
      )
        return false;
    }
  return true;
}
