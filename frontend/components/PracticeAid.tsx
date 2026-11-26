import { useEffect, useState } from "react";
import { useRecorder } from "../hooks/useRecorder";
import type { api } from "../lib/api";
import type { Language, RewriteSuggestion } from "../lib/types";

export function PracticeAid({
  language, sessionId, client, disabled, demo, sttReady, onUse, onSend,
  onActivity, onPrepareRecording, onSpeak, speechReady,
}: {
  language: Language;
  sessionId: string;
  client: typeof api;
  disabled: boolean;
  demo: boolean;
  sttReady: boolean;
  onUse: (text: string) => void;
  onSend: (text: string) => void;
  onActivity: (busy: boolean) => void;
  onPrepareRecording: () => void;
  onSpeak?: (text:string)=>void;
  speechReady?: boolean;
}) {
  const t = (zh: string, en: string) => language === "en" ? en : zh;
  const [panel, setPanel] = useState<"hint" | "express" | "keywords" | null>(null);
  const open = panel !== null;
  const [preparing, setPreparing] = useState(false);
  const [native, setNative] = useState("");
  const [result, setResult] = useState<RewriteSuggestion | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const recorder = useRecorder(
    (value) => setNative(value.original_text),
    setError,
  );
  useEffect(() => {
    onActivity(preparing || working || recorder.listening || recorder.transcribing);
  }, [onActivity, preparing, working, recorder.listening, recorder.transcribing]);
  useEffect(() => () => onActivity(false), [onActivity]);
  async function recordNative() {
    if (!recorder.listening) onPrepareRecording();
    setPreparing(true);
    try {
      await recorder.toggle(sessionId, "auto");
    } finally {
      setPreparing(false);
    }
  }
  async function generate(mode: "hint" | "express" | "keywords") {
    if (disabled || working || recorder.listening || recorder.transcribing) return;
    if (mode === "express" && !native.trim()) return;
    setPanel(mode);
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
        <button disabled={disabled || working || recorder.listening || recorder.transcribing} onClick={() => {setPanel(panel === "hint" || panel === "keywords" ? null : "keywords");setResult(null);setError("");}}>
          ✦ {t("给我提示", "Hint")}
        </button>
        <button disabled={disabled || working} aria-expanded={panel === "express"} onClick={() => {
          if (panel === "express") {
            recorder.cancel();
            setPanel(null);
          } else {
            setPanel("express");
            setResult(null);
          }
        }}>
          {t("用母语表达", "Say it in my language")}
        </button>
      </div>
      {open && (
        <div className="practice-aid-body">
          {(panel === "hint" || panel === "keywords") && !result && !working && <div className="notebook-actions"><button disabled={disabled} onClick={()=>void generate("keywords")}>{t("几个关键词","Keywords")}</button><button disabled={disabled} onClick={()=>void generate("hint")}>{t("完整回答","Full answer")}</button></div>}
          {panel === "express" && <>
          <label>
            {t("你真正想说什么？", "What do you want to say?")}
            <textarea rows={2} maxLength={2000} value={native} onChange={(event) => setNative(event.target.value)} />
          </label>
          <div className="notebook-actions">
            <button disabled={disabled || demo || !sttReady || working || recorder.transcribing} onClick={() => void recordNative()}>
              {recorder.listening ? t("停止录音", "Stop recording") : t("母语录音", "Record in my language")}
            </button>
            <button disabled={disabled || working || !native.trim() || recorder.listening || recorder.transcribing} onClick={() => void generate("express")}>
              {t("帮我用法语说", "Express it in French")}
            </button>
          </div>
          </>}
          {recorder.transcribing && <p role="status">{t("正在转写…", "Transcribing…")}</p>}
          {working && <p role="status">{t("正在准备表达…", "Preparing a suggestion…")}</p>}
          {error && <p role="alert">{error}</p>}
          <button type="button" className="text-button" disabled={working} onClick={() => {
            recorder.cancel();
            setPanel(null);
            setResult(null);
          }}>{t("关闭帮助", "Close help")}</button>
          {result && (
            <article className="aid-suggestion">
              <p lang="fr">{result.expression}</p>
              {panel === "keywords" ? <div className="aid-suggestion-actions"><button className="end-review" disabled={disabled} onClick={()=>void generate("hint")}>{t("完整回答","Full answer")}</button></div> : <div className="aid-suggestion-actions">
                {onSpeak && <button className="text-button" disabled={!speechReady || disabled} onClick={()=>onSpeak(result.expression)}>{t("朗读","Listen")}</button>}
                <button type="button" className="end-review" disabled={disabled || preparing || working || recorder.listening || recorder.transcribing} onClick={() => {
                  onUse(result.expression.slice(0, 2000));
                  setPanel(null);
                  setResult(null);
                }}>
                  {t("编辑", "Edit")}
                </button>
                <button type="button" className="end-review aid-send" disabled={disabled || preparing || working || recorder.listening || recorder.transcribing} onClick={() => {
                  onSend(result.expression.slice(0, 2000));
                  setPanel(null);
                  setResult(null);
                }}>
                  {t("发送", "Send")}
                </button>
              </div>}
            </article>
          )}
        </div>
      )}
    </section>
  );
}
