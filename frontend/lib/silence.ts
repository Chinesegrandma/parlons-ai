/** Local voice activity detection. No audio is sent until a completed turn exists. */
let prepared: AudioContext | null = null;
export function prepareSilence() {
  const AudioContextClass =
    window.AudioContext ||
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AudioContextClass)
    throw new Error("Automatic turn detection is unavailable");
  prepared ||= new AudioContextClass();
  void prepared.resume().catch(() => {});
}
export function releaseSilence() {
  const old = prepared;
  prepared = null;
  if (old && old.state !== "closed") void old.close().catch(() => {});
}
export function watchSilence(
  stream: MediaStream,
  onEnd: () => void,
  onEmpty: () => void,
) {
  prepareSilence();
  const context = prepared!;
  const analyser = context.createAnalyser();
  analyser.fftSize = 1024;
  const source = context.createMediaStreamSource(stream);
  source.connect(analyser); // Deliberately never connected to speakers.
  const samples = new Float32Array(analyser.fftSize);
  const started = performance.now();
  let lastVoice = started,
    voiced = 0,
    previous = started,
    done = false,
    frame = 0;
  void context.resume().catch(() => {
    if (done) return;
    cleanup();
    onEmpty();
  });
  function cleanup() {
    if (done) return;
    done = true;
    cancelAnimationFrame(frame);
    source.disconnect();
  }
  function tick() {
    if (done) return;
    const now = performance.now();
    analyser.getFloatTimeDomainData(samples);
    const rms = Math.sqrt(
      samples.reduce((sum, value) => sum + value * value, 0) / samples.length,
    );
    if (rms > 0.015) {
      voiced += Math.min(now - previous, 100);
      lastVoice = now;
    }
    previous = now;
    if (voiced >= 300 && now - lastVoice >= 1400) {
      cleanup();
      onEnd();
      return;
    }
    if (voiced < 300 && now - started >= 12000) {
      if (done) return;
      cleanup();
      onEmpty();
      return;
    }
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  return cleanup;
}
