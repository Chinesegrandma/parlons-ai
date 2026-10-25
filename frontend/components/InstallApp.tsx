"use client";
import type { Language } from "../lib/types";
import { useEffect, useState } from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
export function InstallApp({ language = "zh" }: { language?: Language }) {
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [instructions, setInstructions] = useState(false);
  const [installed, setInstalled] = useState(false);
  useEffect(() => {
    setInstalled(
      window.matchMedia?.("(display-mode: standalone)").matches ?? false,
    );
    if ("serviceWorker" in navigator && window.isSecureContext)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const offer = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallEvent);
    };
    const done = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", offer);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", offer);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  if (installed) return null;
  return (
    <div className="install-app">
      <button
        className="text-button"
        onClick={async () => {
          if (prompt) {
            await prompt.prompt();
            await prompt.userChoice;
            setPrompt(null);
          } else setInstructions(!instructions);
        }}
      >
        {t("添加到手机主屏幕 ↗", "Add to home screen ↗")}
      </button>
      {instructions && (
        <p>
          {t(
            "在手机上打开 HTTPS 网站。iPhone：分享 → 添加到主屏幕；Android：浏览器菜单 → 安装应用。AI 对话和语音需要联网。",
            "Open the HTTPS site on your phone. iPhone: Share → Add to Home Screen. Android: browser menu → Install app. AI and speech need an internet connection.",
          )}
        </p>
      )}
    </div>
  );
}
