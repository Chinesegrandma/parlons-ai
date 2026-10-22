import { useState } from "react";
import { Check, ChevronDown, Flag, Lightbulb, Plus } from "lucide-react";
import type { Topic } from "../lib/types";
import { practice } from "../lib/practice";
import { scenarios } from "../lib/scenarios";

export function PracticeGuide({
  topic,
  disabled,
  hasDraft,
  onUse,
}: {
  topic: Topic;
  disabled: boolean;
  hasDraft: boolean;
  onUse: (text: string) => void;
}) {
  const [completed, setCompleted] = useState<number[]>([]);
  const [hint, setHint] = useState<number | null>(null);
  const scene = practice[topic];
  return (
    <details className="practice-guide" open>
      <summary>
        <span className="guide-icon">
          <Flag size={16} />
        </span>
        <span>
          <strong>这次，试着完成三件小事</strong>
          <small>{scene.level} · 勾选是你的自我记录，不是 AI 评分</small>
        </span>
        <span className="guide-count">{completed.length}/3</span>
        <ChevronDown size={15} />
      </summary>
      <div className="guide-progress" aria-hidden="true">
        <span style={{ width: `${(completed.length / 3) * 100}%` }} />
      </div>
      <ol>
        {scene.goals.map((goal, index) => (
          <li
            key={goal}
            className={completed.includes(index) ? "goal-done" : ""}
          >
            <div className="goal-row">
              <button
                className="goal-check"
                aria-label={`标记任务：${goal}`}
                aria-pressed={completed.includes(index)}
                onClick={() =>
                  setCompleted((current) =>
                    current.includes(index)
                      ? current.filter((value) => value !== index)
                      : [...current, index],
                  )
                }
              >
                {completed.includes(index) ? <Check size={14} /> : index + 1}
              </button>
              <span>{goal}</span>
              <button
                className="goal-hint"
                aria-expanded={hint === index}
                aria-label={`提示：${goal}`}
                onClick={() => setHint(hint === index ? null : index)}
              >
                <Lightbulb size={13} />
                提示
              </button>
            </div>
            {hint === index && (
              <div className="goal-example">
                <p lang="fr">{scenarios[topic].starters[index]}</p>
                <button
                  disabled={disabled || hasDraft}
                  onClick={() => onUse(scenarios[topic].starters[index])}
                >
                  <Plus size={13} />
                  填入草稿
                </button>
                <small>
                  {hasDraft
                    ? "先发送或清空当前草稿，避免覆盖你的文字。"
                    : "只是表达示例，你可以改成自己的说法。不会自动发送。"}
                </small>
              </div>
            )}
          </li>
        ))}
      </ol>
      {completed.length === 3 && (
        <p className="guide-finished" role="status">
          三个小目标都记下了。继续自由聊聊，或换一个场景再试试。✦
        </p>
      )}
    </details>
  );
}
