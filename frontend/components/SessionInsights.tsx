import { BookOpen, Check, Lightbulb, ArrowUpRight } from "lucide-react";
import { scenarios } from "../lib/scenarios";
import type { Message, Topic } from "../lib/types";
export function SessionInsights({
  topic,
  messages,
  demo,
}: {
  topic: Topic;
  messages: Message[];
  demo: boolean;
}) {
  const scene = scenarios[topic];
  const turns = messages.filter((message) => message.role === "user").length;
  const feedback = messages
    .filter((message) => message.role === "assistant" && message.correction)
    .at(-1);
  return (
    <aside className="insights" aria-label="练习提示与反馈">
      <section className="scene-card">
        <div className="scene-meta">
          <span>LE PETIT STUDIO</span>
          <span>✺</span>
        </div>
        <svg
          className="cafe-art"
          viewBox="0 0 260 165"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M66 149V66a64 64 0 0 1 128 0v83"
            stroke="currentColor"
            strokeWidth="1.2"
          />
          <path
            d="M78 149V67a52 52 0 0 1 104 0v82M130 16v112M79 78h104"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path d="M0 149h260M49 155h166" stroke="currentColor" />
          <path
            d="M97 111h53v14a22 22 0 0 1-44 0v-14ZM150 115h8a10 10 0 0 1 0 20h-9M90 141h73"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M113 101c-11-12 10-13 0-25M130 101c-11-12 10-13 0-25"
            stroke="currentColor"
            strokeLinecap="round"
          />
          <path
            d="M36 148v-25m0 8c-14-1-19-15-15-21 14 1 18 9 15 21Zm1-7c0-14 14-22 21-17-1 12-8 19-21 17Z"
            stroke="currentColor"
            strokeWidth="1.5"
          />
        </svg>
        <h3>
          La vie est une
          <br />
          <em>conversation.</em>
        </h3>
        <p>让每一段对话，都有一点收获。</p>
      </section>
      <section className="insight-section">
        <div className="section-label">
          <Lightbulb size={16} />
          <h3>这次可以聊什么</h3>
        </div>
        <p>{scene.prompt}</p>
      </section>
      <section className="insight-section">
        <div className="section-label">
          <BookOpen size={16} />
          <h3>随手记几个表达</h3>
        </div>
        <div className="wordlist">
          {scene.vocabulary.map(([french, chinese]) => (
            <div key={french}>
              <strong lang="fr">{french}</strong>
              <span>{chinese}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="feedback-summary">
        <div className="section-label">
          <Check size={16} />
          <h3>本轮练习</h3>
          <span className="turn-count">{turns} 次表达</span>
        </div>
        {feedback ? (
          <p>{feedback.correction}</p>
        ) : (
          <p>
            {turns
              ? "继续说下去，反馈会随对话显示。"
              : "先说一句法语吧。发送后，反馈会出现在这里。"}
          </p>
        )}
        {demo && <small>演示为预设反馈，不评估真实语言水平。</small>}
      </section>
      {!demo && (
        <a className="download-link" href="/parlons-demo.html" download>
          下载离线交互演示 <ArrowUpRight size={14} />
        </a>
      )}
    </aside>
  );
}
