import { AssistantAvatar, ASSISTANT_NAME } from "./AssistantAvatar";
import { CorrectionCard } from "./CorrectionCard";
import { useEffect, useRef, type CSSProperties } from "react";
import { Sparkles, Volume2 } from "lucide-react";
import type { Message, Language } from "../lib/types";
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
}) {
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const bottom = useRef<HTMLDivElement>(null);
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
              <button
                className="speak"
                aria-label={t("朗读", "Listen")}
                disabled={!speechReady}
                onClick={() => onSpeak(message.content)}
              >
                <Volume2 size={13} />
                {t("听一遍", "Listen")}
              </button>
            )}
            {!hideCorrections && message.role === "user" && (() => {
              const next = messages[index + 1];
              if (next?.role !== "assistant" || !next.correction) return null;
              return onSaveCorrection ? (
                <CorrectionCard
                  language={language}
                  original={message.content}
                  corrected={next.corrected_text || ""}
                  explanation={next.correction}
                  saved={savedCorrectionIds.includes(next.id)}
                  onSave={() => onSaveCorrection(next.id)}
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
