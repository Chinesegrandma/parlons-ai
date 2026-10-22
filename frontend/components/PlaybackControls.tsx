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
    <div className="playback-controls">
      <label>
        <input
          type="checkbox"
          checked={autoplay}
          onChange={(e) => onAutoplay(e.target.checked)}
        />{" "}
        Autoplay replies
      </label>
      <label>
        <input
          type="checkbox"
          checked={slow}
          onChange={(e) => onSlow(e.target.checked)}
        />{" "}
        Slow playback (0.8×)
      </label>
      <span role="status">
        {ready
          ? "Speech available"
          : "Speech unavailable · text chat available"}
      </span>
      <button onClick={onStop}>Stop audio</button>
      {notice && <p role="status">{notice}</p>}
      {blocked && <button onClick={onRetry}>Play response</button>}
    </div>
  );
}
