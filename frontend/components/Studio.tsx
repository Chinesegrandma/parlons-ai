"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  BookOpen,
  Settings2,
  Volume2,
  X,
} from "lucide-react";
import { CorrectionCard } from "./CorrectionCard";
import { InstallApp } from "./InstallApp";
import { SceneBrowser, LearningSettings, MemoryNotebook } from "./LearningHub";
import { useLearning } from "../hooks/useLearning";
import { type Lesson, type Memory } from "../lib/learning";
import { PracticeGuide } from "./PracticeGuide";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { PlaybackControls } from "./PlaybackControls";
import { useConversation } from "../hooks/useConversation";
import { useRecorder } from "../hooks/useRecorder";
import { useSpeech } from "../hooks/useSpeech";
import { api } from "../lib/api";
import { demoApi } from "../lib/demo";
import { scenarios } from "../lib/scenarios";
import {
  topics,
  type Health,
  type Topic,
  type Voice,
  type PracticeOptions,
} from "../lib/types";

export function Studio({ demo = false }: { demo?: boolean }) {
  const client = demo ? demoApi : api;
  const conversation = useConversation(
    client,
    demo ? "parlons-demo-session" : "parlons-session",
  );
  const learning = useLearning(demo, conversation.session);
  const [voices, setVoices] = useState<Voice[]>([]);
  const speech = useSpeech(
    client,
    voices.some((v) => v.id === learning.voice) ? learning.voice : "default",
  );
  const [completedGoals, setCompletedGoals] = useState<string[]>([]);
  useEffect(() => {
    let active = true;
    client
      .voices()
      .then((v) => {
        if (active) setVoices(v.voices);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [client]);
  const recorder = useRecorder(
    conversation.acceptTranscript,
    conversation.setError,
  );
  const [demoListening, setDemoListening] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [offline, setOffline] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [settings, setSettings] = useState(false);
  const [view, setView] = useState<
    "home" | "practice" | "summary" | "scenes" | "memory"
  >("home");
  const [selected, setSelected] = useState<Topic>("cafe");
  const [moreScenes, setMoreScenes] = useState(false);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [view]);
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
  const topic = conversation.session?.topic || selected;
  const scene = scenarios[topic];
  const messages = conversation.session?.messages || [];
  const turns = messages.filter((m) => m.role === "user").length;
  const latest = [...messages].reverse().find((m) => m.role === "assistant");
  const speechReady = health?.speech_ready ?? false;
  const mock = health?.mock_ai ?? false;
  const activeOptions = conversation.session?.options;
  const deferredFeedback = activeOptions?.feedback === "after_session";
  const dueCount = learning.book.cards.filter(
    (c) => c.accepted && c.due <= Date.now(),
  ).length;
  const topicName = activeOptions?.scene || scenarios[topic].label;
  const examples = [
    ...new Set(messages.filter((m) => m.role === "user").map((m) => m.content)),
  ].slice(-3);

  async function send() {
    if (listening || busy) return;
    speech.stop();
    const reply = await conversation.send();
    if (reply) await speech.playResponse(reply, speechReady);
  }
  function start(
    nextTopic: Topic,
    lesson?: Lesson,
    custom?: string,
    review?: Memory,
  ) {
    speech.stop();
    recorder.cancel();
    setDemoListening(false);
    setStartedAt(Date.now());
    setView("practice");
    setCompletedGoals([]);
    const options: PracticeOptions = {
      ...learning.options,
      scene:
        lesson?.title || (custom ? "自定义情境" : review ? "复习一个表达" : ""),
      situation: lesson?.situation || custom || (review ? review.prompt : ""),
      goals: lesson?.goals || [],
      review_targets: review ? [review.corrected] : [],
    };
    void conversation.start(nextTopic, options);
  }
  function resume() {
    setStartedAt(Date.now());
    setView("practice");
  }
  function finish() {
    speech.stop();
    recorder.cancel();
    setDemoListening(false);
    setElapsed(Math.max(0, Math.round((Date.now() - startedAt) / 1000)));
    setView("summary");
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
    <div
      className={`minimal-app ${view === "practice" ? "practice-mode" : ""}`}
      id="studio"
    >
      <header className="minimal-header">
        <button
          className="wordmark"
          disabled={busy || listening}
          onClick={() => {
            speech.stop();
            setView("home");
          }}
        >
          parlons<span>.</span>
        </button>
        <div className="header-right">
          {(demo || mock) && (
            <span className="demo-label">{demo ? "交互演示" : "模拟体验"}</span>
          )}
          <button
            className="icon-button"
            aria-label="设置"
            aria-expanded={settings}
            onClick={() => setSettings(!settings)}
          >
            {settings ? <X size={19} /> : <Settings2 size={19} />}
          </button>
        </div>
      </header>
      {settings && (
        <section className="minimal-settings" aria-label="设置">
          <h2>设置</h2>
          {!demo && <InstallApp />}
          <LearningSettings
            options={learning.options}
            onChange={learning.setOptions}
            voices={voices}
            voice={learning.voice}
            onVoice={learning.setVoice}
          />
          <details className="advanced-settings">
            <summary>播放与连接</summary>
            <PlaybackControls
              autoplay={speech.autoplay}
              slow={speech.slow}
              ready={speechReady}
              blocked={false}
              notice=""
              onAutoplay={speech.toggleAutoplay}
              onSlow={speech.toggleSlow}
              onRetry={() => void speech.retry()}
              onStop={speech.stop}
            />
            <p>设置用于下一次对话。演示版使用固定内容。</p>
            <button
              className="text-button"
              onClick={() => setRefresh((v) => v + 1)}
            >
              刷新连接
            </button>
          </details>
          {health?.private_site && (
            <form method="post" action="/auth/logout">
              <button className="text-button" type="submit">
                退出登录
              </button>
            </form>
          )}
        </section>
      )}
      <div className="view-content" hidden={settings}>
        {learning.storageError && (
          <p className="connection-note" role="alert">
            {learning.storageError}
          </p>
        )}
        {offline && (
          <div className="connection-note" role="alert">
            暂时无法连接。{" "}
            <button
              onClick={() => {
                setRefresh((v) => v + 1);
                void conversation.start();
              }}
            >
              重试
            </button>
            {!demo && <a href="/demo">试用演示版</a>}
          </div>
        )}
        {view === "home" && (
          <main className="minimal-home">
            <div className="home-intro">
              <h1>
                Un café
                <br />
                <em>et on parle ?</em>
              </h1>
              <p>不用说得完美，先聊起来。</p>
              <button
                className="primary-button"
                disabled={busy || offline}
                onClick={() => start(selected)}
              >
                <Mic size={19} /> 开始练习 <ArrowRight size={18} />
              </button>
              <nav className="scene-tabs" aria-label="Choose a scenario">
                {(["daily", "cafe", "interview", "travel"] as Topic[]).map(
                  (id) => (
                    <button
                      key={id}
                      aria-pressed={selected === id}
                      onClick={() => setSelected(id)}
                    >
                      {
                        {
                          daily: "日常",
                          cafe: "咖啡馆",
                          interview: "面试",
                          travel: "旅行",
                        }[id as "daily" | "cafe" | "interview" | "travel"]
                      }
                    </button>
                  ),
                )}
                <button
                  aria-expanded={moreScenes}
                  onClick={() => setMoreScenes(!moreScenes)}
                >
                  更多场景
                </button>
              </nav>
              {moreScenes && (
                <div className="extra-scenes">
                  {topics
                    .filter(
                      (t) =>
                        !["daily", "cafe", "interview", "travel"].includes(
                          t.id,
                        ),
                    )
                    .map((t) => (
                      <button
                        key={t.id}
                        aria-pressed={selected === t.id}
                        onClick={() => setSelected(t.id)}
                      >
                        {scenarios[t.id].label}
                      </button>
                    ))}
                </div>
              )}
              <div className="home-learning-links">
                <button onClick={() => setView("scenes")}>
                  换个场景 <ArrowRight size={14} />
                </button>
                {dueCount > 0 && (
                  <button onClick={() => setView("memory")}>
                    {dueCount} 个表达待复习 <BookOpen size={14} />
                  </button>
                )}
              </div>
              {turns > 0 && (
                <button
                  className="resume-link"
                  disabled={busy}
                  onClick={resume}
                >
                  继续上次对话 <ArrowRight size={14} />
                </button>
              )}
              {conversation.error && (
                <p className="error" role="alert">
                  {conversation.error}
                </p>
              )}
            </div>
          </main>
        )}
        {view === "scenes" && (
          <SceneBrowser disabled={busy || offline} onStart={start} />
        )}
        {view === "memory" && (
          <MemoryNotebook
            cards={learning.book.cards}
            onUpdate={learning.update}
            onDelete={learning.remove}
            onReview={learning.review}
            onPractice={(card) => start(card.topic, undefined, undefined, card)}
            onAdd={learning.add}
            onSpeak={(text) => void speech.speak(text)}
            speechReady={speechReady}
          />
        )}
        {view === "practice" && (
          <main
            className={`minimal-practice ${latest?.correction && !deferredFeedback ? "has-feedback" : ""}`}
          >
            <div className="practice-topline">
              <button
                className="text-button"
                disabled={busy || listening}
                onClick={() => {
                  speech.stop();
                  setView("home");
                }}
              >
                <ArrowLeft size={15} /> 返回
              </button>
              <span>{topicName}</span>
              <button
                className="text-button"
                disabled={busy || listening}
                onClick={finish}
              >
                结束练习 <ArrowRight size={15} />
              </button>
            </div>
            <section
              className="current-reply"
              aria-label="当前回复"
              aria-live="polite"
            >
              <h1 lang="fr">
                {(latest?.content || "On y va ?").replace(
                  /\s+([!?;:])/g,
                  "\u00a0$1",
                )}
              </h1>
              <button
                className="listen-button"
                aria-label="朗读"
                disabled={!speechReady || !latest || busy || listening}
                onClick={() => latest && void speech.speak(latest.content)}
              >
                <Volume2 size={17} /> 再听一遍
              </button>
            </section>
            {latest?.correction && !deferredFeedback && (
              <CorrectionCard
                original={
                  messages.filter((m) => m.role === "user").at(-1)?.content ||
                  ""
                }
                corrected={latest.corrected_text || ""}
                explanation={latest.correction}
                saved={
                  !!learning.book.cards.find(
                    (c) =>
                      c.sent ===
                        messages.filter((m) => m.role === "user").at(-1)
                          ?.content &&
                      c.corrected === (latest.corrected_text || ""),
                  )?.accepted
                }
                onSave={() => learning.saveCorrection(latest.id)}
              />
            )}
            <section className="speaking-dock" aria-label="轮到你了">
              <p className="voice-status" role="status">
                {listening
                  ? "正在听你说，再点一次结束"
                  : recorder.transcribing
                    ? "正在转写…"
                    : busy
                      ? "正在准备回复…"
                      : speech.speaking
                        ? "正在朗读"
                        : "点击麦克风，慢慢说"}
              </p>
              <Composer
                compact
                transcribing={recorder.transcribing}
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
              {!speechReady && health && (
                <p className="quiet-notice">语音暂不可用，可以打字继续</p>
              )}
              {speech.notice && (
                <p className="quiet-notice" role="status">
                  {speech.notice}
                </p>
              )}
              {speech.blocked && (
                <button
                  className="text-button"
                  onClick={() => void speech.retry()}
                >
                  播放回复
                </button>
              )}
              {speech.speaking && (
                <button className="text-button" onClick={speech.stop}>
                  停止播放
                </button>
              )}
            </section>
            <details className="practice-tools">
              <summary>练习工具</summary>
              {activeOptions?.goals?.length ? (
                <details className="mission-strip">
                  <summary>
                    本次目标{" "}
                    <span>
                      {completedGoals.length}/{activeOptions.goals.length} ·
                      自行确认
                    </span>
                  </summary>
                  {activeOptions.goals.map((goal) => (
                    <label key={goal}>
                      <input
                        type="checkbox"
                        checked={completedGoals.includes(goal)}
                        onChange={(e) =>
                          setCompletedGoals((g) =>
                            e.target.checked
                              ? [...g, goal]
                              : g.filter((v) => v !== goal),
                          )
                        }
                      />
                      {goal}
                    </label>
                  ))}
                </details>
              ) : null}
              {activeOptions?.review_targets?.length ? (
                <p className="review-context">
                  {activeOptions.situation}{" "}
                  <small>先试着回想，笔记会为你保留。</small>
                </p>
              ) : activeOptions?.situation ? (
                <details className="mission-strip">
                  <summary>情境说明</summary>
                  <p>{activeOptions.situation}</p>
                </details>
              ) : null}
              <div className="practice-extras">
                <details>
                  <summary>找点灵感</summary>
                  <div className="minimal-starters">
                    {scene.starters.map((text) => (
                      <button
                        key={text}
                        disabled={
                          busy ||
                          listening ||
                          !!conversation.input ||
                          !!conversation.transcript
                        }
                        onClick={() => conversation.setInput(text)}
                      >
                        {text}
                        <ArrowRight size={14} />
                      </button>
                    ))}
                  </div>
                  <PracticeGuide
                    key={conversation.session?.id || topic}
                    topic={topic}
                    disabled={busy || listening || !conversation.session}
                    hasDraft={!!conversation.input}
                    onUse={conversation.setInput}
                  />
                </details>
                <details>
                  <summary>
                    对话记录 <span>{messages.length} 条消息</span>
                  </summary>
                  <MessageList
                    messages={
                      deferredFeedback
                        ? messages.map((m) => ({ ...m, correction: null }))
                        : messages
                    }
                    busy={busy}
                    speechReady={speechReady && !listening}
                    onSpeak={(text) => void speech.speak(text)}
                  />
                </details>
              </div>
            </details>
          </main>
        )}
        {view === "summary" && (
          <main className="minimal-summary">
            <h1>
              Un petit pas.
              <br />
              <em>每天进步一点。</em>
            </h1>
            <p>今天又多说了一点法语。</p>
            <div className="summary-stats">
              <span>
                <strong>
                  {Math.floor(elapsed / 60)}:
                  {String(elapsed % 60).padStart(2, "0")}
                </strong>{" "}
                本次用时
              </span>
              <span>
                <strong>{turns}</strong> 次表达
              </span>
            </div>
            <section>
              <h2>{examples.length ? "这次练过的表达" : "下次可以试试"}</h2>
              {(examples.length ? examples : scene.starters).map((text) => (
                <p lang="fr" key={text}>
                  {text}
                </p>
              ))}
            </section>
            {messages.some((m) => m.correction) && (
              <section className="session-feedback">
                <h2>本次纠错</h2>
                {messages
                  .filter((m) => m.correction)
                  .map((m) => (
                    <div key={m.id}>
                      {m.corrected_text && <p lang="fr">{m.corrected_text}</p>}
                      <p>{m.correction}</p>
                    </div>
                  ))}
                <button
                  className="text-button"
                  onClick={() => setView("memory")}
                >
                  打开笔记本 <ArrowRight size={14} />
                </button>
              </section>
            )}
            <button className="primary-button" onClick={resume}>
              继续练习 <ArrowRight size={18} />
            </button>
            <button className="text-button" onClick={() => setView("home")}>
              返回首页
            </button>
          </main>
        )}
        <nav className="app-tabs" aria-label="主导航">
          {(
            [
              { id: "home", label: "练习", icon: Mic },
              { id: "memory", label: "笔记本", icon: BookOpen },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              disabled={busy || listening}
              aria-current={
                view === tab.id ||
                (tab.id === "home" &&
                  (view === "practice" ||
                    view === "summary" ||
                    view === "scenes"))
                  ? "page"
                  : undefined
              }
              onClick={() => {
                speech.stop();
                setView(tab.id);
              }}
            >
              <tab.icon size={20} />
              <span>{tab.label}</span>
              {tab.id === "memory" && dueCount > 0 && <i>{dueCount}</i>}
            </button>
          ))}
        </nav>
        <footer className="minimal-footer">
          <span>每天，一点法语。</span>
          <span>
            {demo || mock
              ? "演示内容 · 模拟回复与提示音"
              : "按自己的节奏练习。"}
          </span>
        </footer>
      </div>
    </div>
  );
}
