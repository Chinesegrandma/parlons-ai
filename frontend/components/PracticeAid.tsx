import { useState } from "react";
import { useRecorder } from "../hooks/useRecorder";
import type { api } from "../lib/api";
import type { Language, RewriteSuggestion } from "../lib/types";

export function PracticeAid({
  language, sessionId, client, disabled, demo, sttReady, onUse,
}: {
  language: Language;
  sessionId: string;
  client: typeof api;
  disabled: boolean;
  demo: boolean;
  sttReady: boolean;
  onUse: (text: string) => void;
}) {
  const t = (zh: string, en: string) => language === "en" ? en : zh;
  const [open, setOpen] = useState(false);
  const [native, setNative] = useState("");
  const [result, setResult] = useState<RewriteSuggestion | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRecorder(
    (value) => setNative(value.original_text),
    setError,
  );
  async function generate(mode: "hint" | "express") {
    if (disabled || working || recorder.listening || recorder.transcribing) return;
    if (mode === "express" && !native.trim()) return;
    setOpen(true);
    setWorking(true);
    setError("");
    setResult(null);
    try {
      setResult(await client.assist(sessionId, mode, mode === "express" ? native : "", language));
    } catch {
      setError(t("暂时无法生成提示，请重试。", "Could not generate help. Please try again."));
    } finally {
      setWorking(false);
    }
  }
  return (
    <section className="practice-aid" aria-label={t("表达帮助", "Speaking help")}>
      <div className="notebook-actions">
        <button disabled={disabled || working || recorder.listening || recorder.transcribing} onClick={() => void generate("hint")}>
          ✦ {t("给我提示", "Hint")}
        </button>
        <button disabled={disabled || working} aria-expanded={open} onClick={() => {
          if (open) recorder.cancel();
          setOpen(!open);
        }}>
          {t("用母语表达", "Say it in my language")}
        </button>
      </div>
      {open && (
        <div className="practice-aid-body">
          <label>
            {t("你真正想说什么？", "What do you want to say?")}
            <textarea rows={2} maxLength={2000} value={native} onChange={(event) => setNative(event.target.value)} />
          </label>
          <div className="notebook-actions">
            <button disabled={disabled || demo || !sttReady || working || recorder.transcribing} onClick={() => void recorder.toggle(sessionId, "auto")}>
              {recorder.listening ? t("停止录音", "Stop recording") : t("母语录音", "Record in my language")}
            </button>
            <button disabled={disabled || working || !native.trim() || recorder.listening || recorder.transcribing} onClick={() => void generate("express")}>
              {t("帮我用法语说", "Express it in French")}
            </button>
          </div>
          {recorder.transcribing && <p role="status">{t("正在转写…", "Transcribing…")}</p>}
          {working && <p role="status">{t("正在准备表达…", "Preparing a suggestion…")}</p>}
          {error && <p role="alert">{error}</p>}
          {result && (
            <article className="notebook-entry">
              <small>{t("建议回答（尚未发送）", "Suggested answer (not sent)")}</small>
              <h3 lang="fr">{result.expression}</h3>
              <p>{result.explanation}</p>
              <button className="end-review" disabled={disabled || working || recorder.listening || recorder.transcribing} onClick={() => {
                onUse(result.expression.slice(0, 2000));
                setOpen(false);
                setResult(null);
              }}>
                {t("使用建议，替换输入草稿", "Use suggestion, replace draft")}
              </button>
            </article>
          )}
        </div>
      )}
    </section>
  );
}
