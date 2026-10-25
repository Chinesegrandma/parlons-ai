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
            aria-label="自动朗读"
          />
          <span className="switch-track" />
          自动朗读
        </label>
        <label className={`speed-option ${slow ? "selected" : ""}`}>
          <input
            type="checkbox"
            checked={slow}
            onChange={(event) => onSlow(event.target.checked)}
            aria-label="慢速播放（0.8 倍）"
          />
          0.8× 慢速
        </label>
        <button className="audio-stop" onClick={onStop} aria-label="停止播放">
          <Square size={10} fill="currentColor" />
          停止
        </button>
        <span className={`speech-status ${ready ? "ready" : ""}`} role="status">
          <span className="live-dot" />
          {ready ? "语音可用" : "语音暂不可用，可以打字继续"}
        </span>
      </div>
      {notice && (
        <p className="audio-notice" role="status">
          {notice}
        </p>
      )}
      {blocked && (
        <button className="retry-audio" onClick={onRetry}>
          播放回复
        </button>
      )}
    </div>
  );
}
