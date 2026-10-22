import { useEffect, useRef } from "react";
import { Volume2 } from "lucide-react";
import type { Message } from "../lib/types";

export function MessageList({
  messages,
  busy,
  speechReady,
  onSpeak,
}: {
  messages: Message[];
  busy: boolean;
  speechReady: boolean;
  onSpeak: (text: string) => void;
}) {
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView?.({ behavior: "smooth" });
  }, [messages]);
  return (
    <div
      className="conversation"
      aria-label="Conversation history"
      aria-live="polite"
    >
      {messages.map((message) => (
        <article className={`message ${message.role}`} key={message.id}>
          <div className="avatar">
            {message.role === "assistant" ? "✳" : "You"}
          </div>
          <div className="bubblewrap">
            <div className="bubble">{message.content}</div>
            {message.role === "assistant" && (
              <button
                className="speak"
                disabled={!speechReady}
                onClick={() => onSpeak(message.content)}
              >
                <Volume2 size={15} /> Écouter
              </button>
            )}
            {message.correction && (
              <div className="correction">
                <strong>✦ Feedback</strong>
                <p>{message.correction}</p>
              </div>
            )}
            {message.original_transcript != null && (
              <details className="transcript-history">
                <summary>Transcript versions</summary>
                <p>Original: {message.original_transcript}</p>
                <p>Sent: {message.edited_transcript}</p>
              </details>
            )}
          </div>
        </article>
      ))}
      {busy && <div className="typing">Parlons réfléchit…</div>}
      <div ref={bottom} />
    </div>
  );
}
