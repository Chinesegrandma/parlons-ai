import { AudioLines, Settings2, X, BookOpen } from "lucide-react";
import type { Language, PracticeOptions, Voice } from "../lib/types";
const translate = (language: Language) => (zh: string, en: string) =>
  language === "en" ? en : zh;
export function StudioHeader({
  language,
  status,
  offline,
  privateSite,
  settings,
  onHome,
  onSettings,
  onNotebook,
}: {
  language: Language;
  status: string;
  offline: boolean;
  privateSite: boolean;
  settings: boolean;
  onHome: () => void;
  onSettings: () => void;
  onNotebook?: () => void;
}) {
  const t = translate(language);
  return (
    <header className="app-header">
      <button
        className="app-brand"
        onClick={onHome}
        aria-label={t("返回首页", "Home")}
      >
        <span>
          <AudioLines size={23} />
        </span>
        parlons<span className="brand-period">.</span>
      </button>
      <div className="app-header-actions">
        <span
          className={`connection-pill ${offline ? "unavailable" : ""}`}
          role="status"
        >
          ● {status}
        </span>
        {privateSite && (
          <form method="post" action="/auth/logout">
            <button>{t("退出", "Log out")}</button>
          </form>
        )}
        {onNotebook && (
          <button aria-label={t("笔记本", "Notebook")} onClick={onNotebook}>
            <BookOpen size={19} />
          </button>
        )}
        <button
          aria-label={t("设置", "Settings")}
          aria-expanded={settings}
          onClick={onSettings}
        >
          <Settings2 size={20} />
        </button>
      </div>
    </header>
  );
}
export function PracticeSettings({
  language,
  autoplay,
  slow,
  onLanguage,
  onAutoplay,
  onSlow,
  onClose,
  options,
  onOptions,
  voices = [],
  voice = "default",
  onVoice,
}: {
  language: Language;
  autoplay: boolean;
  slow: boolean;
  onLanguage: (language: Language) => void;
  onAutoplay: (value: boolean) => void;
  onSlow: (value: boolean) => void;
  onClose: () => void;
  options?: PracticeOptions;
  onOptions?: (value: PracticeOptions) => void;
  voices?: Voice[];
  voice?: string;
  onVoice?: (value: string) => void;
}) {
  const t = translate(language);
  return (
    <section className="app-settings" aria-label={t("设置", "Settings")}>
      <header>
        <h2>{t("设置", "Settings")}</h2>
        <button onClick={onClose} aria-label={t("关闭设置", "Close settings")}>
          <X size={18} />
        </button>
      </header>
      <label>
        {t("语言", "Language")}
        <select
          aria-label={t("语言", "Language")}
          value={language}
          onChange={(event) => onLanguage(event.target.value as Language)}
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </label>
      <p>
        {t(
          "同时应用于界面和新生成的反馈。法语练习内容保持法语。",
          "Applies to the interface and new feedback. Practice conversations stay in French.",
        )}
      </p>
      <h3>{t("练习偏好", "Practice preferences")}</h3>
      {options && onOptions && (
        <>
          <label>
            {t("练习级别", "Practice level")}
            <select
              aria-label={t("练习级别", "Practice level")}
              value={options.level}
              onChange={(event) =>
                onOptions({
                  ...options,
                  level: event.target.value as PracticeOptions["level"],
                })
              }
            >
              <option value="A1-A2">A1–A2</option>
              <option value="B1-B2">B1–B2</option>
              <option value="C1">C1</option>
            </select>
          </label>
          <label>
            {t("练习重点", "Practice focus")}
            <select
              value={options.focus}
              onChange={(event) =>
                onOptions({
                  ...options,
                  focus: event.target.value as PracticeOptions["focus"],
                })
              }
            >
              <option value="natural">
                {t("自然表达", "Natural expressions")}
              </option>
              <option value="fluency">{t("流畅交流", "Fluency")}</option>
              <option value="grammar">{t("语法", "Grammar")}</option>
            </select>
          </label>
          <label>
            {t("对话风格", "Partner style")}
            <select
              value={options.persona}
              onChange={(event) =>
                onOptions({
                  ...options,
                  persona: event.target.value as PracticeOptions["persona"],
                })
              }
            >
              <option value="patient">{t("耐心引导", "Patient")}</option>
              <option value="realistic">{t("日常交流", "Realistic")}</option>
              <option value="challenging">
                {t("适度挑战", "Challenging")}
              </option>
            </select>
          </label>
        </>
      )}
      {onVoice && (
        <label>
          {t("声音", "Voice")}
          <select
            aria-label={t("声音", "Voice")}
            value={voices.some((item) => item.id === voice) ? voice : "default"}
            disabled={voices.length < 2}
            onChange={(event) => onVoice(event.target.value)}
          >
            {(voices.length
              ? voices
              : [{ id: "default", name: "Default" }]
            ).map((item) => (
              <option key={item.id} value={item.id}>
                {item.id === "default"
                  ? t("默认声音", "Default voice")
                  : item.id === "warm"
                    ? t("温暖", "Warm")
                    : item.id === "clear"
                      ? t("清晰", "Clear")
                      : item.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label>
        <span>
          {t(
            "逐句模式自动朗读（包括开场）",
            "Autoplay in guided mode (including the opening)",
          )}
        </span>
        <input
          type="checkbox"
          aria-label="Autoplay replies"
          checked={autoplay}
          onChange={(event) => onAutoplay(event.target.checked)}
        />
      </label>
      <label>
        <span>{t("慢速朗读 0.8×", "Slow playback 0.8×")}</span>
        <input
          type="checkbox"
          aria-label="Slow playback (0.8×)"
          checked={slow}
          onChange={(event) => onSlow(event.target.checked)}
        />
      </label>
    </section>
  );
}
