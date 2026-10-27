import { useEffect, useRef, useState } from "react";
import { challengeFor } from "../lib/challenges";
import type { Session, Language } from "../lib/types";
export function ChallengePanel({
  session,
  language,
  disabled,
  onNext,
}: {
  session: Session;
  language: Language;
  disabled: boolean;
  onNext: () => void;
}) {
  const definition = challengeFor(session.topic)!;
  const seed = session.options?.challenge?.seed ?? 0;
  const timer =
    session.topic === "challenge_opinion" &&
    session.options?.challenge?.timer_seconds === 60;
  const [remaining, setRemaining] = useState(60);
  const [running, setRunning] = useState(false);
  const deadline = useRef(0);
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  useEffect(() => {
    if (!running) return;
    const update = () => {
      const value = Math.max(
        0,
        Math.ceil((deadline.current - Date.now()) / 1000),
      );
      setRemaining(value);
      if (!value) setRunning(false);
    };
    const tick = window.setInterval(update, 200);
    const hide = () => {
      if (document.hidden) {
        update();
        setRunning(false);
      }
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearInterval(tick);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [running]);
  return (
    <section
      className="challenge-bar"
      aria-label={t("挑战玩法", "Challenge guide")}
    >
      <details>
        <summary>
          {definition[language]} · {t("查看玩法", "How to play")}
        </summary>
        <p>{language === "en" ? definition.howEn : definition.howZh}</p>
        <p className="challenge-seed" lang="fr">
          {definition.seeds[seed].fr}
        </p>
        {session.topic === "challenge_describe" && (
          <small>
            {t(
              "上面的目标词只显示给你，不会作为答案发给 AI。",
              "The target above is shown to you and is not sent to the AI as an answer.",
            )}
          </small>
        )}
        {session.topic === "challenge_debate" && (
          <small>
            {t("你的立场：", "Your side: ")}
            {session.options?.challenge?.side === "against"
              ? t("反对", "Against")
              : t("支持", "For")}
          </small>
        )}
      </details>
      <div className="challenge-actions">
        {timer && (
          <>
            <output aria-label={t("剩余时间", "Time remaining")}>
              {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </output>
            <button
              disabled={remaining === 0}
              onClick={() => {
                if (running) {
                  setRemaining(
                    Math.max(
                      0,
                      Math.ceil((deadline.current - Date.now()) / 1000),
                    ),
                  );
                  setRunning(false);
                } else {
                  deadline.current = Date.now() + remaining * 1000;
                  setRunning(true);
                }
              }}
            >
              {running
                ? t("暂停计时", "Pause timer")
                : t("开始计时", "Start timer")}
            </button>
            <button
              onClick={() => {
                setRunning(false);
                setRemaining(60);
              }}
            >
              {t("重置", "Reset")}
            </button>
            {remaining === 0 && (
              <span role="status">
                {t(
                  "时间到，可以继续；计时器不会发送或停止录音。",
                  "Time is up. Continue if you like; the timer does not send or stop recording.",
                )}
              </span>
            )}
          </>
        )}
        <button disabled={disabled} onClick={onNext}>
          {t("换一题 · 新对话", "Next prompt · new chat")}
        </button>
      </div>
    </section>
  );
}
