import { useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  Download,
  Pencil,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";
import type { useLearning } from "../hooks/useLearning";
import type { Language } from "../lib/types";
import type { Memory } from "../lib/learning";

export function NotebookPanel({
  language,
  learning,
  onBack,
  onPractice,
  onSpeak,
  speechReady,
}: {
  language: Language;
  learning: ReturnType<typeof useLearning>;
  onBack: () => void;
  onPractice: (card: Memory) => void;
  onSpeak: (text: string) => void;
  speechReady: boolean;
}) {
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  const [expression, setExpression] = useState("");
  const [filter, setFilter] = useState("all");
  const [editing, setEditing] = useState<string | null>(null);
  const [edited, setEdited] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const cards = learning.book.cards.filter(
    (card) =>
      filter === "all" ||
      (filter === "pending"
        ? !card.accepted
        : card.accepted && card.due <= Date.now()),
  );
  function exportNotes() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(learning.book.cards, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "parlons-memory.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <main className="practice-home notebook-panel">
      <button className="back-scenes" onClick={onBack}>
        <ArrowLeft size={16} />
        {t("返回首页", "Home")}
      </button>
      <div className="notebook-heading">
        <div>
          <span className="eyebrow">LES PETITS PROGRÈS</span>
          <h1>{t("笔记本", "Notebook")}</h1>
        </div>
        <button
          className="end-review"
          disabled={!learning.book.cards.length}
          onClick={exportNotes}
        >
          <Download size={15} /> {t("导出", "Export")}
        </button>
      </div>
      <p className="mode-description">
        {t(
          "保存在当前设备。先确认建议，再加入复习；复习记录不是能力评分。",
          "Saved on this device. Confirm suggestions before reviewing; review records are not proficiency scores.",
        )}
      </p>
      {learning.storageError && (
        <p role="alert">
          {t(
            "浏览器未能保存笔记，请导出备份。",
            "The browser could not save your notes. Export a backup.",
          )}
        </p>
      )}
      <form
        className="notebook-add"
        onSubmit={(event) => {
          event.preventDefault();
          if (expression.trim()) {
            learning.add(expression.trim());
            setExpression("");
          }
        }}
      >
        <input
          aria-label={t("收藏一个表达", "Save an expression")}
          maxLength={1200}
          placeholder={t(
            "记下想再次用到的法语表达…",
            "A French expression you want to use again…",
          )}
          value={expression}
          onChange={(event) => setExpression(event.target.value)}
        />
        <button disabled={!expression.trim()}>
          <Plus size={18} />
          {t("收藏", "Save")}
        </button>
      </form>
      <div className="mode-switch notebook-filter">
        {[
          ["all", t("全部", "All")],
          ["pending", t("待确认", "To confirm")],
          ["due", t("待复习", "Due for review")],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
          >
            {label}
          </button>
        ))}
      </div>
      {!cards.length && (
        <div className="notebook-empty">
          <BookOpen size={30} />
          <h2>
            {t("把有用的表达，留在这里。", "Keep useful expressions here.")}
          </h2>
          <p>
            {t(
              "聊天时收藏纠错，或者在上方手动添加。",
              "Save a correction from chat or add an expression above.",
            )}
          </p>
        </div>
      )}
      <div className="notebook-cards">
        {cards.map((card) => (
          <article className="notebook-entry" key={card.id}>
            <header>
              <span>
                {card.accepted
                  ? t("已收藏", "Saved")
                  : t("待确认建议", "Suggestion to confirm")}
              </span>
              <button
                aria-label={t("删除笔记", "Delete note")}
                onClick={() => learning.remove(card.id)}
              >
                <Trash2 size={15} />
              </button>
            </header>
            {filter === "due" && revealed !== card.id ? (
              <>
                <p>
                  {t(
                    "先不看答案，试着在新情境里说一句。",
                    "Try a new sentence before revealing the expression.",
                  )}
                </p>
                <p>{card.prompt}</p>
                <button
                  className="end-review"
                  onClick={() => setRevealed(card.id)}
                >
                  {t("显示表达", "Reveal expression")}
                </button>
              </>
            ) : (
              <>
                {card.original !== card.corrected && (
                  <small lang="fr">{card.original}</small>
                )}
                {editing === card.id ? (
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (edited.trim())
                        learning.update(card.id, { corrected: edited.trim() });
                      setEditing(null);
                    }}
                  >
                    <textarea
                      aria-label={t("编辑笔记", "Edit note")}
                      maxLength={1200}
                      value={edited}
                      onChange={(event) => setEdited(event.target.value)}
                    />
                    <button className="end-review">{t("保存", "Save")}</button>
                  </form>
                ) : (
                  <h2 lang="fr">{card.corrected || card.sent}</h2>
                )}
                <p>{card.explanation}</p>
                <div className="notebook-actions">
                  <button
                    disabled={!speechReady}
                    onClick={() => onSpeak(card.corrected || card.sent)}
                  >
                    <Volume2 size={15} />
                    {t("朗读", "Listen")}
                  </button>
                  <button
                    onClick={() => {
                      setEditing(card.id);
                      setEdited(card.corrected || card.sent);
                    }}
                  >
                    <Pencil size={14} />
                    {t("编辑", "Edit")}
                  </button>
                  {!card.accepted && (
                    <button
                      onClick={() =>
                        learning.update(card.id, { accepted: true })
                      }
                    >
                      <Check size={15} />
                      {t("确认收藏", "Confirm")}
                    </button>
                  )}
                  <button onClick={() => onPractice(card)}>
                    {t("换个情境再练", "Practice in a new situation")} →
                  </button>
                </div>
                {filter === "due" && (
                  <div className="notebook-actions">
                    <button
                      onClick={() => {
                        learning.review(card.id, false);
                        setRevealed(null);
                      }}
                    >
                      {t("还需练习", "Keep practicing")}
                    </button>
                    <button
                      onClick={() => {
                        learning.review(card.id, true);
                        setRevealed(null);
                      }}
                    >
                      {t("我记得了", "I remembered it")}
                    </button>
                  </div>
                )}
              </>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
