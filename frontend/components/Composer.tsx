import { Mic, MicOff, Send } from "lucide-react";
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
          <strong>Original transcript (unchanged)</strong>
          <p>{transcript.original_text}</p>
          <p>Edit the message below before sending. Only text is retained.</p>
          <button disabled={disabled} onClick={onDiscard}>
            Discard draft
          </button>
        </section>
      )}
      <div className="composer">
        <button
          className={`mic ${listening ? "recording" : ""}`}
          disabled={disabled || !sttReady || (!listening && Boolean(input))}
          onClick={onRecord}
          aria-label={listening ? "Stop recording" : "Record French"}
          title={!sttReady ? "Speech recognition unavailable" : "Record French"}
        >
          {listening ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        <input
          aria-label={transcript ? "Edit transcript" : "Message"}
          value={input}
          maxLength={2000}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing &&
              !listening
            )
              onSend();
          }}
          placeholder={listening ? "Listening…" : "Écris ou parle en français…"}
          disabled={disabled || listening}
        />
        <button
          className="send"
          onClick={onSend}
          disabled={!input.trim() || disabled || listening}
          aria-label="Send"
        >
          <Send size={19} />
        </button>
      </div>
      <p className="hint">
        Enter to send · Review transcriptions before sending · Recordings
        limited to 60 seconds · Raw audio not retained by this app
      </p>
    </div>
  );
}
