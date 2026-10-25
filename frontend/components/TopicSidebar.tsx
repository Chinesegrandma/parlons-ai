import { useEffect, useRef } from "react";
import {
  ArrowUpRight,
  Utensils,
  ShoppingBag,
  CalendarDays,
  Users,
  Coffee,
  Compass,
  MessageCircle,
  BriefcaseBusiness,
  AudioLines,
  ShieldCheck,
} from "lucide-react";
import { topics, type Topic } from "../lib/types";
import { scenarios } from "../lib/scenarios";
const icons = {
  restaurant: Utensils,
  shopping: ShoppingBag,
  doctor: CalendarDays,
  friends: Users,
  daily: MessageCircle,
  cafe: Coffee,
  travel: Compass,
  interview: BriefcaseBusiness,
};
export function TopicSidebar({
  topic,
  disabled,
  onSelect,
}: {
  topic: Topic;
  disabled: boolean;
  onSelect: (topic: Topic) => void;
}) {
  const navigation = useRef<HTMLElement>(null);
  useEffect(() => {
    const nav = navigation.current;
    const active = nav?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth) return;
    nav.scrollTo?.({
      left:
        active.offsetLeft -
        nav.offsetLeft -
        (nav.clientWidth - active.offsetWidth) / 2,
      behavior: "smooth",
    });
  }, [topic]);
  return (
    <aside className="sidebar">
      <a className="brand" href="#studio" aria-label="Parlons AI 首页">
        <span className="brandmark">
          <AudioLines size={24} />
        </span>
        <div>
          <strong>
            parlons<span> .</span>
          </strong>
          <small>UN PEU, CHAQUE JOUR</small>
        </div>
      </a>
      <div className="workspace-label">
        <span className="live-dot" /> 你的法语练习空间
      </div>
      <div className="sideheading">
        选择一个话题 <span>01 — 08</span>
      </div>
      <nav
        ref={navigation}
        className="topiclist"
        aria-label="Conversation themes"
      >
        {topics.map((item, index) => {
          const Icon = icons[item.id as keyof typeof icons] || MessageCircle;
          return (
            <button
              key={item.id}
              className={`topic ${topic === item.id ? "active" : ""}`}
              aria-label={scenarios[item.id].label}
              aria-pressed={topic === item.id}
              disabled={disabled}
              onClick={() => onSelect(item.id)}
            >
              <span className="topic-icon">
                <Icon size={19} />
              </span>
              <span className="topic-copy">
                <strong>{scenarios[item.id].label}</strong>
                <small>{item.name}</small>
              </span>
              <span className="topic-number">0{index + 1}</span>
            </button>
          );
        })}
      </nav>
      <div className="side-note">
        <span className="note-star">✺</span>
        <h3>
          Un petit pas,
          <br />
          <em>chaque jour.</em>
        </h3>
        <p>
          不必等到准备好。
          <br />
          每一次开口，都是进步。
        </p>
        <span className="note-line" />
      </div>
      <div className="sidefoot">
        <ShieldCheck size={16} />
        <span>密钥仅保存在服务端</span>
        <ArrowUpRight size={14} />
      </div>
    </aside>
  );
}
