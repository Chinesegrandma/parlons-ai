"use client";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Headphones,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { PlaybackControls } from "./PlaybackControls";
import { TopicSidebar } from "./TopicSidebar";
import { SessionInsights } from "./SessionInsights";
import { useConversation } from "../hooks/useConversation";
import { useRecorder } from "../hooks/useRecorder";
import { useSpeech } from "../hooks/useSpeech";
import { api } from "../lib/api";
import { demoApi } from "../lib/demo";
import { scenarios } from "../lib/scenarios";
import type { Health, Topic } from "../lib/types";

export function Studio({ demo = false }: { demo?: boolean }) {
  const client = demo ? demoApi : api;
  const conversation = useConversation(
    client,
    demo ? "parlons-demo-session" : "parlons-session",
  );
  const speech = useSpeech(client);
  const recorder = useRecorder(
    conversation.acceptTranscript,
    conversation.setError,
  );
  const [demoListening, setDemoListening] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [offline, setOffline] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  useEffect(() => {
    let active = true;
    setOffline(false);
    client
      .health()
      .then((value) => {
        if (active) setHealth(value);
      })
      .catch(() => {
        if (active) {
          setOffline(true);
          setHealth(null);
        }
      });
    return () => {
      active = false;
    };
  }, [client, refresh]);
  const busy = conversation.busy || recorder.transcribing;
  const listening = demo ? demoListening : recorder.listening;
  const topic = conversation.session?.topic || "daily";
  const scene = scenarios[topic];
  const messages = conversation.session?.messages || [];
  const turns = messages.filter((message) => message.role === "user").length;
  const speechReady = health?.speech_ready ?? false;
  const mock = health?.mock_ai ?? false;

  async function send() {
    if (listening || busy) return;
    speech.stop();
    const reply = await conversation.send();
    if (reply) await speech.playResponse(reply, speechReady);
  }
  function start(nextTopic?: Topic) {
    speech.stop();
    recorder.cancel();
    setDemoListening(false);
    void conversation.start(nextTopic);
  }
  function record() {
    speech.stop();
    if (demo) {
      if (demoListening)
        conversation.acceptTranscript({
          id: "demo-transcript",
          original_text: "Je voudrais une café, s’il vous plaît.",
        });
      setDemoListening(!demoListening);
    } else if (conversation.session)
      void recorder.toggle(conversation.session.id);
  }
  return (
    <div className="app-frame" id="studio">
      <TopicSidebar
        topic={topic}
        disabled={busy || listening}
        onSelect={start}
      />
      <main className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            练习空间 <ChevronRight size={13} />
            <strong>{scene.label}</strong>
          </div>
          <div className="topbar-actions">
            <span className={`mode-badge ${offline ? "offline" : ""}`}>
              <span className="live-dot" />
              {offline
                ? "连接暂不可用"
                : !health
                  ? "连接中…"
                  : demo
                    ? "离线交互演示"
                    : mock
                      ? "模拟体验 · 不消耗额度"
                      : health.mode === "ai"
                        ? "真实 API 模式"
                        : "文字演示模式"}
            </span>
            <button
              className="help-button"
              onClick={() => setShowHelp(!showHelp)}
              aria-expanded={showHelp}
            >
              使用指南 <span>?</span>
            </button>
          </div>
        </header>
        {showHelp && (
          <section className="help-panel" aria-label="使用指南">
            <div>
              <strong>01 开口或打字</strong>
              <p>点击麦克风，再次点击结束录音。</p>
            </div>
            <div>
              <strong>02 检查再发送</strong>
              <p>原始转写会保留，你可以编辑草稿。</p>
            </div>
            <div>
              <strong>03 听回复，看反馈</strong>
              <p>
                {demo || mock
                  ? "模拟模式使用预设内容与提示音，不做真实质量评估。"
                  : "反馈针对转写文字，不是发音评分。"}
              </p>
            </div>
          </section>
        )}
        <div className="workspace-content">
          <section className="welcome">
            <div>
              <div className="eyebrow">
                <span /> {scene.subtitle}
              </div>
              <h1>{scene.title}</h1>
              <p>{scene.description}</p>
            </div>
            <span className="welcome-flower" aria-hidden="true">
              ✺
            </span>
          </section>
          <div className="studio-grid">
            <section className="chat-card" aria-label="法语对话工作台">
              <div className="chat-card-header">
                <div className="tutor-identity">
                  <div className="tutor-avatar">
                    <Headphones size={22} />
                    <span />
                  </div>
                  <div>
                    <h2>
                      Parlons français <span>✦</span>
                    </h2>
                    <p>
                      你的法语搭子 <span>·</span> B1–B2 自由练习
                    </p>
                  </div>
                </div>
                <button
                  className="new-session"
                  disabled={busy || listening}
                  onClick={() =>
                    start(conversation.session ? topic : undefined)
                  }
                >
                  <RotateCcw size={14} />
                  {conversation.session ? "新对话" : "重新连接"}
                </button>
              </div>
              <div className="practice-path">
                <span
                  className={!conversation.transcript ? "current" : "complete"}
                >
                  <i>{conversation.transcript ? <Check size={10} /> : "1"}</i>
                  表达
                </span>
                <ChevronRight size={12} />
                <span className={conversation.transcript ? "current" : ""}>
                  <i>2</i>检查转写
                </span>
                <ChevronRight size={12} />
                <span className={turns ? "complete" : ""}>
                  <i>{turns ? <Check size={10} /> : "3"}</i>回复与反馈
                </span>
                <small>{turns} 次表达</small>
              </div>
              <MessageList
                messages={messages}
                busy={busy}
                speechReady={speechReady}
                onSpeak={(text) => void speech.speak(text)}
              />
              <div className="starter-area">
                <span>
                  <Sparkles size={12} /> 不知道怎么开始？
                </span>
                <div>
                  {scene.starters.map((text) => (
                    <button
                      key={text}
                      disabled={
                        busy || listening || Boolean(conversation.transcript)
                      }
                      onClick={() => conversation.setInput(text)}
                    >
                      {text}
                      <ArrowRight size={12} />
                    </button>
                  ))}
                </div>
              </div>
              <PlaybackControls
                autoplay={speech.autoplay}
                slow={speech.slow}
                ready={speechReady}
                blocked={speech.blocked}
                notice={speech.notice}
                onAutoplay={speech.toggleAutoplay}
                onSlow={speech.toggleSlow}
                onRetry={() => void speech.retry()}
                onStop={speech.stop}
              />
              <Composer
                input={conversation.input}
                transcript={conversation.transcript}
                disabled={busy || !conversation.session}
                listening={listening}
                sttReady={health?.stt_ready ?? false}
                error={conversation.error}
                onChange={conversation.setInput}
                onRecord={record}
                onSend={() => void send()}
                onDiscard={conversation.discard}
                demo={demo}
              />
            </section>
            <SessionInsights
              topic={topic}
              messages={messages}
              demo={demo || mock}
            />
          </div>
          <footer className="workspace-footer">
            <span>
              PARLONS AI <i>·</i> 少一点犹豫，多一点表达。
            </span>
            <div>
              <button
                onClick={() => setRefresh((value) => value + 1)}
                disabled={busy}
              >
                刷新连接状态
              </button>
              {!demo && (
                <a href="/demo">
                  无需密钥体验 <ArrowRight size={12} />
                </a>
              )}
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
