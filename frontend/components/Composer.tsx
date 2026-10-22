import { ArrowUp, Mic, Square, ScanText, X } from "lucide-react";
import type { Transcript } from "../lib/types";
export function Composer({
  input,
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
  input: string;
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
              原始转写 · 已保留
            </strong>
            <button
              disabled={disabled}
              onClick={onDiscard}
              aria-label="Discard draft"
            >
              <X size={15} />
            </button>
          </div>
          <p>{transcript.original_text}</p>
          <small>在下方修改后再发送，原始转写不会被覆盖。</small>
        </section>
      )}
      {listening && (
        <div className="recording-status" role="status">
          <span className="live-dot" />
          {demo
            ? "正在演示录音流程，不会开启麦克风。再次点击以查看示例转写。"
            : "正在听你说… 点击停止后可检查转写。"}
          <span className="sound-bars">▂ ▅ ▃ ▇ ▄ ▂ ▆ ▃</span>
        </div>
      )}
      <div className={`composer ${listening ? "is-listening" : ""}`}>
        <button
          className={`mic ${listening ? "recording" : ""}`}
          disabled={disabled || !sttReady || (!listening && Boolean(input))}
          onClick={onRecord}
          aria-label={listening ? "Stop recording" : "Record French"}
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
            <Mic size={21} />
          )}
        </button>
        <input
          aria-label={transcript ? "Edit transcript" : "Message"}
          value={input}
          maxLength={2000}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing &&
              !listening
            )
              onSend();
          }}
          placeholder={
            listening
              ? "Prenez votre temps… 慢慢说"
              : "说点什么，或者用法语写下来…"
          }
          disabled={disabled || listening}
        />
        <button
          className="send"
          onClick={onSend}
          disabled={!input.trim() || disabled || listening}
          aria-label="Send"
        >
          <ArrowUp size={21} />
        </button>
      </div>
      <div className="composer-hint">
        <span>
          {demo
            ? "本地演示 · 预设回复 · 播放为提示音"
            : "点击麦克风录音，再次点击结束 · 最长 60 秒"}
        </span>
        <span>Enter 发送 ↵</span>
      </div>
    </div>
  );
}
