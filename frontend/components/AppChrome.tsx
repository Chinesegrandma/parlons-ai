import { AudioLines, Settings2, X } from "lucide-react";
import type { Language } from "../lib/types";
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
}: {
  language: Language;
  status: string;
  offline: boolean;
  privateSite: boolean;
  settings: boolean;
  onHome: () => void;
  onSettings: () => void;
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
}: {
  language: Language;
  autoplay: boolean;
  slow: boolean;
  onLanguage: (language: Language) => void;
  onAutoplay: (value: boolean) => void;
  onSlow: (value: boolean) => void;
  onClose: () => void;
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
