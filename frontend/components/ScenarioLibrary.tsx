import { useState } from "react";
import { ArrowUpRight, Search, X } from "lucide-react";
import { scenarios } from "../lib/scenarios";
import { practice } from "../lib/practice";
import { topics, type Topic } from "../lib/types";

export function ScenarioLibrary({
  onSelect,
  disabled,
}: {
  onSelect: (topic: Topic) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const filtered = topics.filter(({ id, name }) =>
    `${scenarios[id].label} ${name} ${scenarios[id].description}`
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  return (
    <section className="scenario-library">
      <button
        className="explore-scenes"
        aria-expanded={open}
        aria-controls="scenario-library"
        onClick={() => setOpen(!open)}
      >
        {open ? <X size={16} /> : <Search size={16} />}{" "}
        {open ? "收起场景库" : "探索 8 个生活场景"}
      </button>
      {open && (
        <div id="scenario-library" className="library-panel">
          <div className="library-heading">
            <div>
              <span className="eyebrow">VOTRE PROCHAINE CONVERSATION</span>
              <h2>今天，想在哪里开口？</h2>
              <p>每个场景都有 3 个小任务。不必一次说完，按自己的节奏来。</p>
            </div>
            <label className="scene-search">
              <Search size={16} />
              <input
                aria-label="搜索练习场景"
                placeholder="搜索场景，如：点餐、购物"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
          </div>
          <div className="scene-library-grid">
            {filtered.map(({ id, emoji, name }) => (
              <button
                className="scene-option"
                key={id}
                disabled={disabled}
                onClick={() => {
                  onSelect(id);
                  setOpen(false);
                  setSearch("");
                }}
                aria-label={`开始${scenarios[id].label}练习`}
              >
                <div className="scene-option-top">
                  <span className="scene-emoji" aria-hidden="true">
                    {emoji}
                  </span>
                  <span>{practice[id].level}</span>
                  <ArrowUpRight size={18} />
                </div>
                <h3>{scenarios[id].label}</h3>
                <em lang="fr">{name}</em>
                <p>{scenarios[id].description}</p>
                <span className="scene-option-footer">
                  3 个引导任务 <span>开始练习 →</span>
                </span>
              </button>
            ))}
          </div>
          {!filtered.length && (
            <p className="scene-empty" role="status">
              没有找到这个场景。试试“餐厅”“旅行”，或清空搜索。
            </p>
          )}
        </div>
      )}
    </section>
  );
}
