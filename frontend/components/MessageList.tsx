import { useEffect, useRef } from "react";
import { AudioLines, Sparkles, Volume2 } from "lucide-react";
import type { Message } from "../lib/types";
export function MessageList({
  messages,
  busy,
  busyLabel = "正在准备回复…",
  speechReady,
  onSpeak,
}: {
  messages: Message[];
  busy: boolean;
  busyLabel?: string;
  speechReady: boolean;
  onSpeak: (text: string) => void;
}) {
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
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
      {messages.map((message) => (
        <article className={`message ${message.role}`} key={message.id}>
          <div className="avatar">
            {message.role === "assistant" ? <AudioLines size={17} /> : "你"}
          </div>
          <div className="bubblewrap">
            <div className="message-author">
              {message.role === "assistant" ? "Parlons · 你的法语搭子" : "你"}
              <span>{message.role === "assistant" ? "FR" : "VOUS"}</span>
            </div>
            <div className="bubble" lang="fr">
              {message.content}
            </div>
            {message.role === "assistant" && (
              <button
                className="speak"
                aria-label="Écouter"
                disabled={!speechReady}
                onClick={() => onSpeak(message.content)}
              >
                <Volume2 size={13} />
                听一遍
              </button>
            )}
            {message.correction && (
              <div className="correction">
                <strong>
                  <Sparkles size={13} /> 一个小建议
                </strong>
                <p>{message.correction}</p>
              </div>
            )}
            {message.original_transcript != null && (
              <details className="transcript-history">
                <summary>查看原始转写与发送版本</summary>
                <p>原始：{message.original_transcript}</p>
                <p>发送：{message.edited_transcript}</p>
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
