import { useState } from "react";
import { MistakeTrainer } from "./MistakeTrainer";
import {
  ArrowLeft,
  BookOpen,
  Download,
  Pencil,
  Plus,
  Trash2,
  Volume2,
} from "lucide-react";
import type { useLearning } from "../hooks/useLearning";
import type { Language } from "../lib/types";
import { practiceStreak, type Memory } from "../lib/learning";
import { catalog } from "../lib/catalog";

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
  const [view, setView] = useState<"notes" | "mistakes" | "history">("notes");
  const [expression, setExpression] = useState("");
  const [filter, setFilter] = useState("all");
  const history = learning.book.practiceHistory || [];
  const due = learning.book.cards.filter(c => c.due <= Date.now() && (c.corrected || c.sent));
  const [openedHistory, setOpenedHistory] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [edited, setEdited] = useState("");
  const [revealed, setRevealed] = useState<string | null>(null);
  const cards = learning.book.cards.filter(
    (card) =>
      filter === "all" ? card.accepted : card.due <= Date.now() && Boolean(card.corrected || card.sent),
  );
  function exportNotes() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(learning.book, null, 2)], {
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
          <h1>{t("我的学习", "My learning")}</h1>
        </div>
        <button
          className="end-review"
          disabled={!learning.book.cards.length && !learning.book.mistakes?.length}
          onClick={exportNotes}
        >
          <Download size={15} /> {t("导出", "Export")}
        </button>
      </div>
      <div className="study-stats">
        <div><strong>{new Set(history.map(r=>r.id)).size}</strong><small>{t("练习对话","Conversations")}</small></div>
        <div><strong>{history.filter((r,i)=>history.findIndex(x=>x.id===r.id)===i).reduce((n,r)=>n+r.spokenTurns,0)}</strong><small>{t("语音表达","Spoken turns")}</small></div>
        <div><strong>{practiceStreak(history)}</strong><small>{t("连续天数","Day streak")}</small></div>
      </div>
      <button className="daily-main" onClick={()=>{setView("notes");setFilter("due")}}><span>{t("今日复习","Review today")} · {due.length}</span> →</button>
      <small className="study-storage">{t("学习记录保存在当前浏览器。","Learning history is stored in this browser.")}</small>
      {learning.storageError && (
        <p role="alert">
          {t(
            "浏览器未能保存笔记，请导出备份。",
            "The browser could not save your notes. Export a backup.",
          )}
        </p>
      )}
      <div className="mode-switch notebook-filter">
        <button aria-pressed={view === "notes"} onClick={() => {setView("notes");setFilter("all");}}>
          {t("收藏表达", "Saved expressions")}
        </button>
        <button aria-pressed={view === "mistakes"} onClick={() => setView("mistakes")}>
          {t("我的弱点", "My mistakes")} ({learning.book.mistakes?.length || 0})
        </button>
        <button aria-pressed={view === "history"} onClick={()=>setView("history")}>{t("练习历史","History")}</button>
      </div>
      {view === "history" ? (
        <section className="notebook-cards">
          {!history.length && <p>{t("还没有练习记录。","No practice yet.")}</p>}
          {history.filter((r,i)=>history.findIndex(x=>x.id===r.id)===i).map(r=><article className="notebook-entry" key={r.id}>
            <button className="history-entry" aria-expanded={openedHistory===r.id} onClick={()=>setOpenedHistory(openedHistory===r.id?null:r.id)}><span><strong>{r.scene || catalog.find(s=>s.id===r.topic)?.[language] || r.topic}</strong><small>{r.day} · {r.turns} {t("次表达","turns")}</small></span><span>{openedHistory===r.id?"−":"+"}</span></button>
            {openedHistory===r.id && <div className="history-transcript">{r.messages.map(m=><p key={m.id} lang="fr"><small>{m.role==="user"?t("我","Me"):m.partner==="noe"?"Noé":"Camille"}</small>{m.content}</p>)}</div>}
          </article>)}
        </section>
      ) : view === "mistakes" ? (
        <MistakeTrainer language={language} mistakes={learning.book.mistakes || []} onRemove={learning.removeMistake} />
      ) : (<>
      {filter === "all" && <form
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
      </form>}
      <div className="mode-switch notebook-filter">
        {[
          ["all", t("全部", "All")],
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
            {filter === "due" ? t("今天的复习已完成。","You’re caught up.") : t("还没有收藏表达。","No saved expressions yet.")}
          </h2>
          <p>
            {t(
              "在对话中收藏，或手动添加。",
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
                  : t("自动复习", "Review")}
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
                <button className="end-review" onClick={()=>onPractice(card)}>{t("开口练习","Speak it")}</button>
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
                      {t("收藏表达", "Save expression")}
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
      </>)}
    </main>
  );
}
