import { BookOpen } from "lucide-react";
import { topics, type Topic } from "../lib/types";

export function TopicSidebar({
  topic,
  disabled,
  onSelect,
}: {
  topic: Topic;
  disabled: boolean;
  onSelect: (topic: Topic) => void;
}) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brandmark">p.</span>
        <div>
          <strong>
            parlons<span className="accent">ai</span>
          </strong>
          <small>French speaking studio</small>
        </div>
      </div>
      <div className="sideheading">CONVERSATION THEMES</div>
      <nav className="topiclist" aria-label="Conversation themes">
        {topics.map((item) => (
          <button
            key={item.id}
            className={`topic ${topic === item.id ? "active" : ""}`}
            disabled={disabled}
            onClick={() => onSelect(item.id)}
          >
            <span>{item.emoji}</span>
            {item.name}
          </button>
        ))}
      </nav>
      <div className="sidefoot">
        <BookOpen size={17} />
        <span>
          Learn by speaking.
          <br />
          Grow with every session.
        </span>
      </div>
    </aside>
  );
}
