import { AssistantAvatar, ASSISTANT_NAME } from "./AssistantAvatar";
import { CorrectionCard } from "./CorrectionCard";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Sparkles, Volume2, Languages, Copy, Check } from "lucide-react";
import type { Message, Language, RewriteStyle, RewriteSuggestion } from "../lib/types";
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
}: {
  language?: Language;
  onSaveCorrection?: (id: number) => void;
  savedCorrectionIds?: number[];
  hideCorrections?: boolean;
  messages: Message[];
  busy: boolean;
  busyLabel?: string;
  speechReady: boolean;
  onSpeak: (text: string) => void;
  onTranslate: (text: string, language: Language) => Promise<string>;
  onRewrite?: (text: string, style: RewriteStyle, language: Language) => Promise<RewriteSuggestion>;
}) {
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const bottom = useRef<HTMLDivElement>(null);
  const translationCache = useRef(new Map<string, string>());
  const [expanded, setExpanded] = useState<number[]>([]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [loadingTranslation, setLoadingTranslation] = useState<string | null>(null);
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
      setLoadingTranslation((current) => current === key ? null : current);
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
            <div className="bubble" lang="fr">
              {message.content}
            </div>
            {message.role === "assistant" && (
              <div className="reply-actions">
                <button className="speak" aria-label={t("朗读", "Listen")}
                  disabled={!speechReady} onClick={() => onSpeak(message.content)}>
                  <Volume2 size={13} /> {t("听一遍", "Listen")}
                </button>
                <button className="speak" aria-expanded={expanded.includes(message.id)}
                  onClick={() => void toggleTranslation(message)}>
                  <Languages size={13} /> {expanded.includes(message.id)
                    ? t("收起翻译", "Hide translation") : t("翻译", "Translate")}
                </button>
                <button className="speak" onClick={() => void copyReply(message)}>
                  {copiedId === message.id ? <Check size={13} /> : <Copy size={13} />}
                  {copiedId === message.id ? t("已复制", "Copied") : t("复制", "Copy")}
                </button>
                {expanded.includes(message.id) && (() => {
                  const key = language + ":" + message.id + ":" + message.content;
                  return (
                    <div className="reply-translation" lang={language === "zh" ? "zh-CN" : "en"}>
                      {translations[key] || translationCache.current.get(key)
                        || (loadingTranslation === key ? t("正在翻译…", "Translating…")
                        : translationError === key
                        ? <button onClick={() => {
                            setExpanded((ids) => ids.filter((id) => id !== message.id));
                            setTranslationError(null);
                          }}>{t("翻译失败，点击收起后重试", "Translation failed. Close and retry.")}</button>
                        : t("正在准备翻译…", "Preparing translation…"))}
                    </div>
                  );
                })()}
              </div>
            )}
            {!hideCorrections && message.role === "user" && (() => {
              const next = messages[index + 1];
              if (next?.role !== "assistant") return null;
              return onSaveCorrection ? (
                <CorrectionCard
                  language={language}
                  original={message.content}
                  corrected={next.corrected_text || ""}
                  explanation={next.correction || ""}
                  saved={savedCorrectionIds.includes(next.id)}
                  onSave={() => onSaveCorrection(next.id)}
                  onRewrite={onRewrite}
                />
              ) : (
                <div className="correction">
                  <strong><Sparkles size={13} /> {t("表达改进", "Improve your expression")}</strong>
                  {next.corrected_text && <p lang="fr">{next.corrected_text}</p>}
                  <p>{next.correction}</p>
                </div>
              );
            })()}
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
  );
}
