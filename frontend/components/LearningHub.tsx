"use client";
import { useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Check,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";
import { lessons, type Lesson, type Memory } from "../lib/learning";
import type { PracticeOptions, Topic, Voice } from "../lib/types";

export function SceneBrowser({
  onStart,
  disabled,
}: {
  onStart: (topic: Topic, lesson?: Lesson, custom?: string) => void;
  disabled: boolean;
}) {
  const [category, setCategory] = useState("Work");
  const [custom, setCustom] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<Lesson | null>(null);
  return (
    <main className="learning-page">
      <h1>换个场景</h1>
      <form
        className="custom-scene"
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) onStart("daily", undefined, custom.trim());
        }}
      >
        <label htmlFor="custom-scene">你想练习什么？</label>
        <p>写下你即将面对的真实对话，中文也可以。</p>
        <textarea
          id="custom-scene"
          maxLength={1000}
          rows={3}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="比如：明天要向主管解释项目为什么延期…"
        />
        <button
          className="text-button"
          disabled={disabled || !custom.trim()}
          type="submit"
        >
          开始我的情境 <ArrowRight size={16} />
        </button>
      </form>
      <h2 className="section-title">也可以从这里开始</h2>
      <div className="category-tabs" aria-label="Scene categories">
        {["Work", "Everyday", "Travel"].map((c) => (
          <button
            key={c}
            aria-pressed={category === c}
            onClick={() => {
              setCategory(c);
              setSelected(null);
            }}
          >
            {
              (
                { Work: "工作", Everyday: "日常", Travel: "旅行" } as Record<
                  string,
                  string
                >
              )[c]
            }
          </button>
        ))}
      </div>
      <div className="lesson-grid">
        {lessons
          .filter((l) => l.category === category)
          .slice(0, showAll ? undefined : 4)
          .map((l, i) => (
            <button
              className={`lesson-card ${selected?.id === l.id ? "chosen" : ""}`}
              key={l.id}
              aria-expanded={selected?.id === l.id}
              onClick={() => setSelected(selected?.id === l.id ? null : l)}
            >
              <span className="lesson-meta">
                {String(i + 1).padStart(2, "0")} <span>{l.minutes} 分钟</span>
              </span>
              <h2>{l.title}</h2>
              <p lang="fr">{l.french}</p>
              <span className="lesson-goal">
                {l.goals[0]} <ArrowRight size={16} />
              </span>
            </button>
          ))}
      </div>
      {lessons.filter((l) => l.category === category).length > 4 && (
        <button className="text-button" onClick={() => setShowAll(!showAll)}>
          {showAll ? "收起场景" : "更多场景"}
        </button>
      )}
      {selected && (
        <section className="lesson-detail" aria-label="Selected scene">
          <h2>{selected.title}</h2>
          <ol>
            {selected.goals.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ol>
          <button
            className="primary-button"
            disabled={disabled}
            onClick={() => onStart(selected.topic, selected)}
          >
            练习这个场景 <ArrowRight size={16} />
          </button>
        </section>
      )}
    </main>
  );
}

export function LearningSettings({
  options,
  onChange,
  voices,
  voice,
  onVoice,
}: {
  options: PracticeOptions;
  onChange: (v: PracticeOptions) => void;
  voices: Voice[];
  voice: string;
  onVoice: (v: string) => void;
}) {
  return (
    <div className="learning-settings">
      <fieldset className="segments">
        <legend>法语水平</legend>
        {(["A1-A2", "B1-B2", "C1"] as const).map((level) => (
          <button
            key={level}
            aria-pressed={options.level === level}
            onClick={() => onChange({ ...options, level })}
          >
            {level}
          </button>
        ))}
      </fieldset>
      <fieldset className="segments">
        <legend>解释语言</legend>
        {(["Chinese", "English", "French"] as const).map((language) => (
          <button
            key={language}
            aria-pressed={options.explanation_language === language}
            onClick={() =>
              onChange({ ...options, explanation_language: language })
            }
          >
            {{ Chinese: "中文", English: "英文", French: "法文" }[language]}
          </button>
        ))}
      </fieldset>
      <details className="advanced-settings">
        <summary>更多偏好</summary>
        <div className="settings-grid">
          <label>
            练习重点
            <select
              value={options.focus}
              onChange={(e) =>
                onChange({
                  ...options,
                  focus: e.target.value as PracticeOptions["focus"],
                })
              }
            >
              <option value="fluency">流畅表达</option>
              <option value="grammar">语法准确</option>
              <option value="natural">自然表达与搭配</option>
            </select>
          </label>
          <label>
            对话角色
            <select
              value={options.persona}
              onChange={(e) =>
                onChange({
                  ...options,
                  persona: e.target.value as PracticeOptions["persona"],
                })
              }
            >
              <option value="patient">耐心引导</option>
              <option value="realistic">日常交流</option>
              <option value="challenging">适度挑战</option>
            </select>
          </label>
          <label>
            纠错时机
            <select
              value={options.feedback}
              onChange={(e) =>
                onChange({
                  ...options,
                  feedback: e.target.value as PracticeOptions["feedback"],
                })
              }
            >
              <option value="each_turn">每轮后反馈</option>
              <option value="after_session">练习结束后反馈</option>
            </select>
          </label>
          <label>
            声音
            <select
              value={voices.some((v) => v.id === voice) ? voice : "default"}
              disabled={voices.length < 2}
              onChange={(e) => onVoice(e.target.value)}
            >
              {voices.length ? (
                voices.map((v) => (
                  <option value={v.id} key={v.id}>
                    {(
                      {
                        default: "默认声音",
                        warm: "温暖",
                        clear: "清晰",
                      } as Record<string, string>
                    )[v.id] || v.name}
                  </option>
                ))
              ) : (
                <option value="default">尚未连接声音</option>
              )}
            </select>
          </label>
        </div>
      </details>
      <p className="settings-note">
        目前根据文字纠错，暂不评估发音、连诵或鼻化元音。
      </p>
    </div>
  );
}

export function MemoryNotebook({
  cards,
  onUpdate,
  onDelete,
  onReview,
  onPractice,
  onAdd,
  onSpeak,
  speechReady,
}: {
  cards: Memory[];
  onUpdate: (id: string, change: Partial<Memory>) => void;
  onDelete: (id: string) => void;
  onReview: (id: string, remembered: boolean) => void;
  onPractice: (card: Memory) => void;
  onAdd: (text: string) => void;
  onSpeak: (text: string) => void;
  speechReady: boolean;
}) {
  const [filter, setFilter] = useState("All");
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [answer, setAnswer] = useState("");
  const [expression, setExpression] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const due = cards.filter((c) => c.accepted && c.due <= Date.now());
  const visible = cards.filter(
    (c) =>
      filter === "All" ||
      (filter === "To check" ? !c.accepted : c.accepted && c.due <= Date.now()),
  );
  const current = cards.find((c) => c.id === reviewing);
  function exportNotes() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(cards, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "parlons-memory.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <main className="learning-page notebook-page">
      <h1>笔记本</h1>
      {cards.length > 0 && (
        <div className="notebook-summary">
          <BookOpen size={23} />
          <div>
            <strong>{due.length} 个表达待复习</strong>
            <span>每天复习一点。</span>
          </div>
          <button
            className="text-button"
            disabled={!due.length}
            onClick={() => {
              setReviewing(due[0].id);
              setRevealed(false);
              setAnswer("");
            }}
          >
            开始复习 <ArrowRight size={16} />
          </button>
        </div>
      )}
      <p className="local-note">
        保存在当前设备。请先确认纠错建议，再加入复习。
      </p>
      {current && (
        <section className="review-card" aria-label="笔记复习">
          <span className="overline">先不看答案，试一次</span>
          <h2>{current.prompt}</h2>
          <label>
            你的尝试
            <textarea
              rows={2}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="说出来，或者在这里写下你的尝试…"
            />
          </label>
          <button className="text-button" onClick={() => setRevealed(true)}>
            查看笔记
          </button>
          {revealed && (
            <>
              <p lang="fr" className="review-answer">
                {current.corrected || current.sent}
              </p>
              <p>{current.explanation}</p>
              <small>
                Self-check, not an AI score. Reading the answer is different
                from recalling it.
              </small>
              <div className="card-actions">
                <button
                  onClick={() => {
                    onReview(current.id, false);
                    setReviewing(null);
                  }}
                >
                  还需要练习
                </button>
                <button
                  onClick={() => {
                    onReview(current.id, true);
                    setReviewing(null);
                  }}
                >
                  我独立想起来了
                </button>
              </div>
            </>
          )}
          <button className="text-button" onClick={() => setReviewing(null)}>
            结束复习
          </button>
        </section>
      )}
      {cards.length > 0 && (
        <div className="category-tabs">
          {["All", "To check", "Due today"].map((f) => (
            <button
              key={
                (
                  {
                    All: "全部",
                    "To check": "待确认",
                    "Due today": "今天复习",
                  } as Record<string, string>
                )[f]
              }
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {
                (
                  {
                    All: "全部",
                    "To check": "待确认",
                    "Due today": "今天复习",
                  } as Record<string, string>
                )[f]
              }
            </button>
          ))}
        </div>
      )}
      {!visible.length && (
        <div className="notebook-empty">
          <BookOpen size={32} />
          <h2>
            {cards.length ? "这里已经复习完了。" : "把想记住的表达，留在这里。"}
          </h2>
          <p>练习中的纠错会出现在这里，也可以收藏喜欢的表达。</p>
        </div>
      )}
      <div className="memory-list">
        {visible.map((card) => (
          <article className="memory-card" key={card.id}>
            <div className="memory-meta">
              <span>
                {card.scene} ·{" "}
                {card.kind === "expression"
                  ? "收藏表达"
                  : `${card.occurrences} 次出现`}
              </span>
              <button
                className="icon-button"
                aria-label={`删除笔记：${card.sent}`}
                onClick={() => onDelete(card.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
            {!card.accepted && (
              <span className="candidate-tag">待确认的建议</span>
            )}
            {card.kind === "correction" && (
              <>
                <span className="note-label">
                  {card.original !== card.sent ? "原始转写" : "你说的或写的"}
                </span>
                <p className="original-phrase" lang="fr">
                  {card.original}
                </p>
                {card.original !== card.sent && (
                  <p className="edited-phrase">发送版本：{card.sent}</p>
                )}
              </>
            )}
            <span className="note-label">
              {card.kind === "expression" ? "收藏的表达" : "更自然的说法"}
            </span>
            <p className="corrected-phrase" lang="fr">
              {card.corrected || "展开说明，检查建议的表达。"}
            </p>
            <details>
              <summary>为什么？</summary>
              <p>{card.explanation}</p>
            </details>
            {editing === card.id && (
              <form
                className="note-edit"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (editText.trim()) {
                    onUpdate(card.id, {
                      corrected: editText.trim(),
                      accepted: true,
                    });
                    setEditing(null);
                  }
                }}
              >
                <label>
                  修改表达
                  <input
                    maxLength={1200}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                </label>
                <button type="submit" disabled={!editText.trim()}>
                  保存修改
                </button>
              </form>
            )}
            <div className="card-actions">
              {!card.accepted && (
                <button
                  disabled={!card.corrected}
                  onClick={() => onUpdate(card.id, { accepted: true })}
                >
                  <Check size={14} /> 保留
                </button>
              )}
              <button
                onClick={() => {
                  setEditing(card.id);
                  setEditText(card.corrected || card.sent);
                }}
              >
                编辑
              </button>
              <button
                disabled={!speechReady || !card.corrected}
                onClick={() => onSpeak(card.corrected)}
              >
                <Volume2 size={14} /> 朗读
              </button>
              <button
                disabled={!card.accepted || !card.corrected}
                onClick={() => onPractice(card)}
              >
                换个情境再练 <ArrowRight size={14} />
              </button>
            </div>
            {card.accepted && (
              <small className="review-date">
                {card.reviews ? `${card.reviews} 次独立回想 · ` : ""}
                {card.due <= Date.now()
                  ? "可以复习了"
                  : `下次复习：${new Date(card.due).toLocaleDateString()}`}
              </small>
            )}
          </article>
        ))}
      </div>
      <form
        className="save-expression"
        onSubmit={(e) => {
          e.preventDefault();
          if (expression.trim()) {
            onAdd(expression.trim());
            setExpression("");
          }
        }}
      >
        <label htmlFor="save-expression">收藏一句表达</label>
        <div>
          <input
            id="save-expression"
            maxLength={1200}
            placeholder="Ça te dit de…"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
          />
          <button aria-label="保存表达" disabled={!expression.trim()}>
            <Plus size={19} />
          </button>
        </div>
      </form>
      <button
        className="text-button"
        disabled={!cards.length}
        onClick={exportNotes}
      >
        导出笔记
      </button>
    </main>
  );
}
