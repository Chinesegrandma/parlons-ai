import { Square, Volume2 } from "lucide-react";
export function PlaybackControls({
  autoplay,
  slow,
  ready,
  blocked,
  notice,
  onAutoplay,
  onSlow,
  onRetry,
  onStop,
}: {
  autoplay: boolean;
  slow: boolean;
  ready: boolean;
  blocked: boolean;
  notice: string;
  onAutoplay: (value: boolean) => void;
  onSlow: (value: boolean) => void;
  onRetry: () => void;
  onStop: () => void;
}) {
  return (
    <div className="playback-area">
      <div className="playback-controls">
        <Volume2 size={15} />
        <label className="switch-label">
          <input
            type="checkbox"
            checked={autoplay}
            onChange={(event) => onAutoplay(event.target.checked)}
            aria-label="Autoplay replies"
          />
          <span className="switch-track" />
          自动朗读
        </label>
        <label className={`speed-option ${slow ? "selected" : ""}`}>
          <input
            type="checkbox"
            checked={slow}
            onChange={(event) => onSlow(event.target.checked)}
            aria-label="Slow playback (0.8×)"
          />
          0.8× 慢速
        </label>
        <button className="audio-stop" onClick={onStop} aria-label="Stop audio">
          <Square size={10} fill="currentColor" />
          停止
        </button>
        <span className={`speech-status ${ready ? "ready" : ""}`} role="status">
          <span className="live-dot" />
          {ready
            ? "Speech available"
            : "Speech unavailable · text chat available"}
        </span>
      </div>
      {notice && (
        <p className="audio-notice" role="status">
          {notice}
        </p>
      )}
      {blocked && (
        <button className="retry-audio" onClick={onRetry}>
          Play response
        </button>
      )}
    </div>
  );
}
