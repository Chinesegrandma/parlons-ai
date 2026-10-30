import { useState } from "react";
import { Volume2, Copy, Check } from "lucide-react";
import type { Language } from "../lib/types";

export function TextActions({
  text,
  language,
  speechReady,
  onSpeak,
}: {
  text: string;
  language: Language;
  speechReady: boolean;
  onSpeak?: (text: string, rate?: 0.8 | 1) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  return (
    <div className="text-actions">
      <button
        type="button"
        className="speak"
        disabled={!speechReady || !onSpeak}
        aria-label={t("朗读这条表达", "Listen to this expression")}
        onClick={() => onSpeak?.(text, 1)}
      >
        <Volume2 size={14} />
        {t("发音", "Listen")}
      </button>
      <button
        type="button"
        className="speak"
        aria-label={t("复制这条表达", "Copy this expression")}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setFailed(false);
          } catch {
            setFailed(true);
          }
        }}
      >
        {copied ? <Check size={14} /> : <Copy size={14} />}{" "}
        {copied ? t("已复制", "Copied") : t("复制", "Copy")}
      </button>
      {failed && (
        <span role="status">
          {t(
            "复制失败，请选择文字复制。",
            "Copy failed. Select the text to copy.",
          )}
        </span>
      )}
    </div>
  );
}
