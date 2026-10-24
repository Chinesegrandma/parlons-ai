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
  const [selected, setSelected] = useState<Lesson | null>(null);
  return (
    <main className="learning-page">
      <span className="overline">FRENCH FOR YOUR REAL LIFE</span>
      <h1>
        Find your next
        <br />
        <em>little conversation.</em>
      </h1>
      <p className="page-intro">
        A small situation. A clear goal. Your own pace.
      </p>
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
            {c}
          </button>
        ))}
      </div>
      <div className="lesson-grid">
        {lessons
          .filter((l) => l.category === category)
          .map((l, i) => (
            <button
              className={`lesson-card ${selected?.id === l.id ? "chosen" : ""}`}
              key={l.id}
              aria-expanded={selected?.id === l.id}
              onClick={() => setSelected(selected?.id === l.id ? null : l)}
            >
              <span className="lesson-meta">
                {String(i + 1).padStart(2, "0")} <span>{l.minutes} MIN</span>
              </span>
              <h2>{l.title}</h2>
              <p lang="fr">{l.french}</p>
              <span className="lesson-goal">
                {l.goals[0]} <ArrowRight size={16} />
              </span>
            </button>
          ))}
      </div>
      {selected && (
        <section className="lesson-detail" aria-label="Selected scene">
          <span className="overline">YOUR SMALL MISSION</span>
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
            Practice this scene <ArrowRight size={16} />
          </button>
        </section>
      )}
      <form
        className="custom-scene"
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) onStart("daily", undefined, custom.trim());
        }}
      >
        <label htmlFor="custom-scene">Something on your mind?</label>
        <p>
          Describe a real conversation you want to prepare for, in any language.
        </p>
        <textarea
          id="custom-scene"
          maxLength={1000}
          rows={3}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Tomorrow I need to explain a project delay to my manager…"
        />
        <button
          className="text-button"
          disabled={disabled || !custom.trim()}
          type="submit"
        >
          Make it my practice <ArrowRight size={16} />
        </button>
      </form>
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
      <p>These preferences apply to your next conversation.</p>
      <div className="settings-grid">
        <label>
          Your level
          <select
            value={options.level}
            onChange={(e) =>
              onChange({
                ...options,
                level: e.target.value as PracticeOptions["level"],
              })
            }
          >
            <option value="A1-A2">A1–A2 · with a little help</option>
            <option value="B1-B2">B1–B2 · keep it flowing</option>
            <option value="C1">C1 · nuance and challenge</option>
          </select>
        </label>
        <label>
          Your focus
          <select
            value={options.focus}
            onChange={(e) =>
              onChange({
                ...options,
                focus: e.target.value as PracticeOptions["focus"],
              })
            }
          >
            <option value="fluency">Keep the conversation flowing</option>
            <option value="grammar">Grammar & accuracy</option>
            <option value="natural">Natural expressions & collocations</option>
          </select>
        </label>
        <label>
          Conversation partner
          <select
            value={options.persona}
            onChange={(e) =>
              onChange({
                ...options,
                persona: e.target.value as PracticeOptions["persona"],
              })
            }
          >
            <option value="patient">Patient · helps you find your words</option>
            <option value="realistic">Everyday · short and natural</option>
            <option value="challenging">
              Challenging · asks you to clarify
            </option>
          </select>
        </label>
        <label>
          Feedback timing
          <select
            value={options.feedback}
            onChange={(e) =>
              onChange({
                ...options,
                feedback: e.target.value as PracticeOptions["feedback"],
              })
            }
          >
            <option value="each_turn">After each turn</option>
            <option value="after_session">At the end of practice</option>
          </select>
        </label>
        <label>
          Explain in
          <select
            value={options.explanation_language}
            onChange={(e) =>
              onChange({
                ...options,
                explanation_language: e.target
                  .value as PracticeOptions["explanation_language"],
              })
            }
          >
            <option>Chinese</option>
            <option>English</option>
            <option>French</option>
          </select>
        </label>
        <label>
          Voice
          <select
            value={voices.some((v) => v.id === voice) ? voice : "default"}
            disabled={voices.length < 2}
            onChange={(e) => onVoice(e.target.value)}
          >
            {voices.length ? (
              voices.map((v) => (
                <option value={v.id} key={v.id}>
                  {v.name}
                </option>
              ))
            ) : (
              <option value="default">Voice not connected</option>
            )}
          </select>
        </label>
      </div>
      <p>
        Feedback covers your words and expressions. Pronunciation, liaison and
        nasal-vowel scoring are not available yet.
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
      <span className="overline">A FEW WORDS WORTH KEEPING</span>
      <h1>
        Your memory
        <br />
        <em>notebook.</em>
      </h1>
      <p className="page-intro">From “I keep forgetting” to “I’ve got this”.</p>
      <div className="notebook-summary">
        <BookOpen size={23} />
        <div>
          <strong>{due.length} ready to revisit</strong>
          <span>Short practice, a little at a time.</span>
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
          Review <ArrowRight size={16} />
        </button>
      </div>
      <p className="local-note">
        Saved on this browser. No account sync. Suggested corrections need your
        confirmation.
      </p>
      {current && (
        <section className="review-card" aria-label="Memory review">
          <span className="overline">TRY WITHOUT THE ANSWER</span>
          <h2>{current.prompt}</h2>
          <label>
            Your attempt
            <textarea
              rows={2}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Say it aloud, or write your attempt here…"
            />
          </label>
          <button className="text-button" onClick={() => setRevealed(true)}>
            Reveal my note
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
                  Still practising
                </button>
                <button
                  onClick={() => {
                    onReview(current.id, true);
                    setReviewing(null);
                  }}
                >
                  I recalled it independently
                </button>
              </div>
            </>
          )}
          <button className="text-button" onClick={() => setReviewing(null)}>
            Close review
          </button>
        </section>
      )}
      <div className="category-tabs">
        {["All", "To check", "Due today"].map((f) => (
          <button
            key={f}
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
      </div>
      {!visible.length && (
        <div className="notebook-empty">
          <BookOpen size={32} />
          <h2>
            {cards.length
              ? "All caught up here."
              : "Your words will find a home here."}
          </h2>
          <p>
            Corrections from your conversations appear here. You can also save
            an expression you love.
          </p>
        </div>
      )}
      <div className="memory-list">
        {visible.map((card) => (
          <article className="memory-card" key={card.id}>
            <div className="memory-meta">
              <span>
                {card.scene} ·{" "}
                {card.kind === "expression"
                  ? "Saved expression"
                  : `${card.occurrences} occurrence${card.occurrences === 1 ? "" : "s"}`}
              </span>
              <button
                className="icon-button"
                aria-label={`Delete note: ${card.sent}`}
                onClick={() => onDelete(card.id)}
              >
                <Trash2 size={15} />
              </button>
            </div>
            {!card.accepted && (
              <span className="candidate-tag">SUGGESTION · PLEASE CHECK</span>
            )}
            {card.kind === "correction" && (
              <>
                <span className="note-label">
                  {card.original !== card.sent
                    ? "Original transcript"
                    : "You said / wrote"}
                </span>
                <p className="original-phrase" lang="fr">
                  {card.original}
                </p>
                {card.original !== card.sent && (
                  <p className="edited-phrase">Sent: {card.sent}</p>
                )}
              </>
            )}
            <span className="note-label">
              {card.kind === "expression"
                ? "Keep this expression"
                : "Suggested expression"}
            </span>
            <p className="corrected-phrase" lang="fr">
              {card.corrected ||
                "Open the feedback below to check the suggested wording."}
            </p>
            <details>
              <summary>Why?</summary>
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
                  Corrected expression
                  <input
                    maxLength={1200}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                </label>
                <button type="submit" disabled={!editText.trim()}>
                  Save change
                </button>
              </form>
            )}
            <div className="card-actions">
              {!card.accepted && (
                <button
                  disabled={!card.corrected}
                  onClick={() => onUpdate(card.id, { accepted: true })}
                >
                  <Check size={14} /> Keep
                </button>
              )}
              <button
                onClick={() => {
                  setEditing(card.id);
                  setEditText(card.corrected || card.sent);
                }}
              >
                Edit
              </button>
              <button
                disabled={!speechReady || !card.corrected}
                onClick={() => onSpeak(card.corrected)}
              >
                <Volume2 size={14} /> Listen
              </button>
              <button
                disabled={!card.accepted || !card.corrected}
                onClick={() => onPractice(card)}
              >
                Try in a new scene <ArrowRight size={14} />
              </button>
            </div>
            {card.accepted && (
              <small className="review-date">
                {card.reviews
                  ? `${card.reviews} independent self-check${card.reviews === 1 ? "" : "s"} · `
                  : ""}
                {card.due <= Date.now()
                  ? "Ready to review"
                  : `Next review ${new Date(card.due).toLocaleDateString()}`}
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
        <label htmlFor="save-expression">An expression you want to keep</label>
        <div>
          <input
            id="save-expression"
            maxLength={1200}
            placeholder="Ça te dit de…"
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
          />
          <button aria-label="Save expression" disabled={!expression.trim()}>
            <Plus size={19} />
          </button>
        </div>
      </form>
      <button
        className="text-button"
        disabled={!cards.length}
        onClick={exportNotes}
      >
        Export my notes
      </button>
    </main>
  );
}
