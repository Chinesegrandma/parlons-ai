import { useEffect, useState } from "react";
import { ArrowUp, Mic, Square, ScanText, X, Keyboard } from "lucide-react";
import type { Transcript } from "../lib/types";
export function Composer({
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
  compact = false,
}: {
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
  compact?: boolean;
}) {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const showEditor =
    !compact || keyboardOpen || !!input || !!transcript || !sttReady;
  const [seconds, setSeconds] = useState(0);
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
        <section className="transcript-review" aria-label="检查转写">
          <div>
            <strong>
              <ScanText size={15} />
              原始转写已保留
            </strong>
            <button
              disabled={disabled}
              onClick={onDiscard}
              aria-label="放弃草稿"
            >
              <X size={15} />
            </button>
          </div>
          <p>{transcript.original_text}</p>
          <small>检查后发送，修改不会覆盖原始转写。</small>
        </section>
      )}
      {listening && (
        <div className="recording-status" role="status">
          <span className="live-dot" />
          {demo ? "模拟录音，再点一次查看转写。" : "正在听你说，再点一次结束。"}
          <time className="recording-timer">
            0:{String(seconds).padStart(2, "0")} / 1:00
          </time>
          <span className="sound-bars">▂ ▅ ▃ ▇ ▄ ▂ ▆ ▃</span>
        </div>
      )}
      {transcribing && (
        <div className="transcription-status" role="status">
          <ScanText size={16} /> Transcribing… review your words before sending.
        </div>
      )}
      <div
        className={`composer ${listening ? "is-listening" : ""} ${showEditor ? "with-editor" : "voice-only"}`}
      >
        <button
          className={`mic ${listening ? "recording" : ""}`}
          disabled={disabled || !sttReady || (!listening && Boolean(input))}
          onClick={onRecord}
          aria-label={listening ? "结束录音" : "开始录音"}
          title={
            !sttReady
              ? "语音识别不可用"
              : demo
                ? "演示录音流程（不录音）"
                : "开始录音"
          }
        >
          {listening ? (
            <Square size={17} fill="currentColor" />
          ) : (
            <Mic size={28} />
          )}
        </button>
        {showEditor && (
          <textarea
            rows={2}
            aria-label={transcript ? "编辑转写" : "输入内容"}
            value={input}
            maxLength={2000}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                !event.nativeEvent.isComposing &&
                !listening
              ) {
                event.preventDefault();
                onSend();
              }
            }}
            placeholder={listening ? "Prenez votre temps…" : "用法语写下来…"}
            disabled={disabled || listening}
          />
        )}
        {showEditor && (
          <button
            className="send"
            onClick={onSend}
            disabled={!input.trim() || disabled || listening}
            aria-label="发送"
          >
            <ArrowUp size={21} />
          </button>
        )}
        {compact && (
          <button
            className="keyboard-toggle"
            aria-label={keyboardOpen ? "收起键盘" : "键盘输入"}
            aria-expanded={showEditor}
            disabled={listening || disabled}
            onClick={() => setKeyboardOpen(!keyboardOpen)}
          >
            <Keyboard size={22} />
          </button>
        )}
      </div>
      <div className="composer-hint">
        <span>
          {demo ? "演示内容 · 模拟回复与提示音" : "点击录音 · 最长 60 秒"}
        </span>
        <span className="desktop-hint">Enter 发送 ↵</span>
      </div>
    </div>
  );
}
