import { useEffect, useState } from "react";
import { ArrowUp, Mic, Square, ScanText, X, LoaderCircle } from "lucide-react";
import type { Transcript, Language } from "../lib/types";
export function Composer({
  language = "zh",
  hideMicrophone = false,
  input,
  transcribing = false,
  transcript,
  disabled,
  listening,
  sttReady,
  error,
  onChange,
  onRecord,
  onSend,
  onDiscard,
  demo = false,
}: {
  language?: Language;
  hideMicrophone?: boolean;
  input: string;
  transcribing?: boolean;
  transcript: Transcript | null;
  disabled: boolean;
  listening: boolean;
  sttReady: boolean;
  error: string;
  onChange: (text: string) => void;
  onRecord: () => void;
  onSend: () => void;
  onDiscard: () => void;
  demo?: boolean;
}) {
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const [seconds, setSeconds] = useState(0);
  const hasDraft = Boolean(input.trim());
  const canRecord = !hideMicrophone && sttReady;
  const action = listening
    ? "stop"
    : transcribing
      ? "transcribing"
      : hasDraft || hideMicrophone
        ? "send"
        : "record";
  const actionLabel = listening
    ? t("停止录音", "Stop recording")
    : transcribing
      ? t("正在转写", "Transcribing")
      : hasDraft || hideMicrophone
        ? t("发送", "Send")
        : t("录制法语", "Record French");
  useEffect(() => {
    setSeconds(0);
    if (!listening) return;
    const timer = window.setInterval(
      () => setSeconds((value) => Math.min(value + 1, 60)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [listening]);
  return (
    <div className="composerarea">
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      {transcript && (
        <section className="transcript-review" aria-label="Review transcript">
          <div>
            <strong>
              <ScanText size={15} />
              {t("原始转写 · 已保留", "Original transcript · preserved")}
            </strong>
            <button
              disabled={disabled}
              onClick={onDiscard}
              aria-label={t("丢弃草稿", "Discard draft")}
            >
              <X size={15} />
            </button>
          </div>
          <p>{transcript.original_text}</p>
          <small>
            {t(
              "在下方修改后再发送，原始转写不会被覆盖。",
              "Edit below before sending. The original stays unchanged.",
            )}
          </small>
        </section>
      )}
      {listening && (
        <div className="recording-status" role="status">
          <span className="live-dot" />
          {hideMicrophone
            ? t(
                "也可以输入文字继续对话。",
                "You can also type to continue the conversation.",
              )
            : demo
              ? t(
                  "正在演示录音流程，不会开启麦克风。再次点击以查看示例转写。",
                  "Demo recording only. Tap again for a sample transcript.",
                )
              : t(
                  "正在听你说… 点击停止后可检查转写。",
                  "Listening… stop to review your transcript.",
                )}
          <time className="recording-timer">
            0:{String(seconds).padStart(2, "0")} / 1:00
          </time>
          <span className="sound-bars">▂ ▅ ▃ ▇ ▄ ▂ ▆ ▃</span>
        </div>
      )}
      {transcribing && (
        <div className="transcription-status" role="status">
          <ScanText size={16} />{" "}
          {t(
            "正在转写，完成后可以检查和编辑，暂未发送。",
            "Transcribing. You can edit before sending.",
          )}
        </div>
      )}
      <div className={`composer ${listening ? "is-listening" : ""}`}>
        <textarea
          rows={2}
          aria-label={
            transcript
              ? t("编辑转写", "Edit transcript")
              : t("输入内容", "Message")
          }
          value={input}
          maxLength={2000}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              !listening &&
              !transcribing &&
              !disabled &&
              hasDraft
            ) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder={
            listening
              ? t(
                  "Prenez votre temps… 慢慢说",
                  "Prenez votre temps… Take your time",
                )
              : t(
                  "说点什么，或者用法语写下来…",
                  "Say something, or write in French…",
                )
          }
          disabled={disabled || listening || transcribing}
        />
        <button
          type="button"
          className={`composer-action ${(hasDraft || hideMicrophone) && !listening ? "send" : "mic"} ${listening ? "recording" : ""}`}
          data-action={action}
          onClick={() => {
            if (disabled || transcribing) return;
            if (listening) onRecord();
            else if (hasDraft) onSend();
            else if (canRecord) onRecord();
          }}
          disabled={
            disabled || transcribing || (!listening && !hasDraft && !canRecord)
          }
          aria-label={actionLabel}
          aria-busy={transcribing}
          title={actionLabel}
        >
          {listening ? (
            <Square size={17} fill="currentColor" />
          ) : transcribing ? (
            <LoaderCircle size={21} className="action-loading" />
          ) : hasDraft || hideMicrophone ? (
            <ArrowUp size={21} />
          ) : (
            <Mic size={21} />
          )}
        </button>
      </div>
    </div>
  );
}
