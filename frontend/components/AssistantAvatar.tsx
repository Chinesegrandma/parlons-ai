import type { Language } from "../lib/types";
export const ASSISTANT_NAME = "Camille";
export function AssistantAvatar({
  size = 36,
  language = "zh",
}: {
  size?: number;
  language?: Language;
}) {
  return (
    <svg
      className="assistant-portrait"
      width={size}
      height={size}
      viewBox="0 0 80 80"
      role="img"
      aria-label={
        language === "en"
          ? "Camille, your AI French assistant"
          : "Camille，你的 AI 法语女助理"
      }
    >
      <rect width="80" height="80" rx="24" fill="#e7eedf" />
      <path
        d="M18 49V29c0-16 11-23 23-23 15 0 23 10 23 26v24H18Z"
        fill="#5b4439"
      />
      <path d="M10 80c2-18 12-25 30-25s29 8 31 25" fill="#5e826d" />
      <path d="M32 49h16v14c-4 6-12 6-16 0" fill="#dfb398" />
      <ellipse cx="40" cy="33" rx="17" ry="22" fill="#edc7ad" />
      <path
        d="M22 32c0-18 8-23 20-23 9 0 19 6 19 18-11-1-18-5-23-12-2 8-8 14-16 17"
        fill="#5b4439"
      />
      <path
        d="M30 33h3m14 0h3"
        stroke="#513e34"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M35 43c3 3 7 3 10 0"
        fill="none"
        stroke="#ad7564"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M25 59l8 8 7-5 7 5 8-8"
        fill="none"
        stroke="#f3f0dd"
        strokeWidth="2"
      />
      <circle cx="23" cy="39" r="2" fill="#cfad69" />
      <circle cx="57" cy="39" r="2" fill="#cfad69" />
    </svg>
  );
}
