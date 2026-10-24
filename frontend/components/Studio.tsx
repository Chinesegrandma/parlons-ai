"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Mic,
  BookOpen,
  Compass,
  Settings2,
  Volume2,
  X,
} from "lucide-react";
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
  const topicName =
    activeOptions?.scene || topics.find((t) => t.id === topic)?.name;
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
        lesson?.title ||
        (custom ? "Your own scene" : review ? "Revisit an expression" : ""),
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
    <div className="minimal-app" id="studio">
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
          <span className="language-label">FRENCH, EVERY DAY</span>
          {(demo || mock) && (
            <span className="demo-label">
              {demo ? "Interactive demo" : "Practice preview"}
            </span>
          )}
          <button
            className="icon-button"
            aria-label="Settings"
            aria-expanded={settings}
            onClick={() => setSettings(!settings)}
          >
            {settings ? <X size={19} /> : <Settings2 size={19} />}
          </button>
        </div>
      </header>
      {settings && (
        <section className="minimal-settings" aria-label="Settings">
          <h2>Make yourself comfortable.</h2>
          {!demo && <InstallApp />}
          <LearningSettings
            options={learning.options}
            onChange={learning.setOptions}
            voices={voices}
            voice={learning.voice}
            onVoice={learning.setVoice}
          />
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
          <p>
            Tap the microphone, speak, then tap again. Review your words before
            sending.
          </p>
          <p>
            Feedback is based on your transcript. The demo uses fixed examples;
            your chosen preferences guide live conversations.
          </p>
          <button
            className="text-button"
            onClick={() => setRefresh((v) => v + 1)}
          >
            Refresh connection
          </button>
          {health?.private_site && (
            <form method="post" action="/auth/logout">
              <button className="text-button" type="submit">
                Sign out
              </button>
            </form>
          )}
        </section>
      )}
      {learning.storageError && (
        <p className="connection-note" role="alert">
          {learning.storageError}
        </p>
      )}
      {offline && (
        <div className="connection-note" role="alert">
          Connection unavailable.{" "}
          <button
            onClick={() => {
              setRefresh((v) => v + 1);
              void conversation.start();
            }}
          >
            Try again
          </button>
          {!demo && <a href="/demo">Explore the demo</a>}
        </div>
      )}
      {view === "home" && (
        <main className="minimal-home">
          <div className="home-intro">
            <span className="overline">
              A LITTLE FRENCH. A LITTLE MORE YOU.
            </span>
            <h1>
              Un café
              <br />
              <em>et on parle ?</em>
            </h1>
            <p>No perfect sentences. Just a conversation.</p>
            <button
              className="primary-button"
              disabled={busy || offline}
              onClick={() => start(selected)}
            >
              <Mic size={19} /> Start speaking <ArrowRight size={18} />
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
                        daily: "Daily life",
                        cafe: "Café",
                        interview: "Interview",
                        travel: "Travel",
                      }[id as "daily" | "cafe" | "interview" | "travel"]
                    }
                  </button>
                ),
              )}
              <button
                aria-expanded={moreScenes}
                onClick={() => setMoreScenes(!moreScenes)}
              >
                More +
              </button>
            </nav>
            {moreScenes && (
              <div className="extra-scenes">
                {topics
                  .filter(
                    (t) =>
                      !["daily", "cafe", "interview", "travel"].includes(t.id),
                  )
                  .map((t) => (
                    <button
                      key={t.id}
                      aria-pressed={selected === t.id}
                      onClick={() => setSelected(t.id)}
                    >
                      {t.name}
                    </button>
                  ))}
              </div>
            )}
            <div className="home-learning-links">
              <button onClick={() => setView("scenes")}>
                Find a real-life scene <ArrowRight size={14} />
              </button>
              {dueCount > 0 && (
                <button onClick={() => setView("memory")}>
                  {dueCount} expressions to revisit <BookOpen size={14} />
                </button>
              )}
            </div>
            {turns > 0 && (
              <button className="resume-link" disabled={busy} onClick={resume}>
                Continue your last conversation <ArrowRight size={14} />
              </button>
            )}
            {conversation.error && (
              <p className="error" role="alert">
                {conversation.error}
              </p>
            )}
          </div>
          <div className="home-bottom">
            <span>01 — SPEAK FREELY</span>
            <span>02 — FIND YOUR WORDS</span>
            <span>03 — MAKE IT A HABIT</span>
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
        <main className="minimal-practice">
          <div className="practice-topline">
            <button
              className="text-button"
              disabled={busy || listening}
              onClick={() => {
                speech.stop();
                setView("home");
              }}
            >
              <ArrowLeft size={15} /> Back
            </button>
            <span>{topicName}</span>
            <button
              className="text-button"
              disabled={busy || listening}
              onClick={finish}
            >
              Finish session <ArrowRight size={15} />
            </button>
          </div>
          {activeOptions?.goals?.length ? (
            <details className="mission-strip">
              <summary>
                Your mission{" "}
                <span>
                  {completedGoals.length}/{activeOptions.goals.length} ·
                  self-check
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
              <small>Try from memory. Your note stays in the notebook.</small>
            </p>
          ) : activeOptions?.situation ? (
            <details className="mission-strip">
              <summary>Practice brief</summary>
              <p>{activeOptions.situation}</p>
            </details>
          ) : null}
          <section
            className="current-reply"
            aria-label="Current response"
            aria-live="polite"
          >
            <span className="overline">
              {listening
                ? "I’M LISTENING"
                : busy
                  ? "ONE LITTLE MOMENT"
                  : speech.speaking
                    ? "PARLONS IS SPEAKING"
                    : "À VOUS DE PARLER"}
            </span>
            <h1 lang="fr">{latest?.content || "On y va ?"}</h1>
            <button
              className="listen-button"
              aria-label="Écouter"
              disabled={!speechReady || !latest || busy || listening}
              onClick={() => latest && void speech.speak(latest.content)}
            >
              <Volume2 size={17} /> Listen again
            </button>
          </section>
          {latest?.correction && !deferredFeedback && (
            <aside className="gentle-correction">
              <span>A LITTLE LANGUAGE NOTE</span>
              <details>
                <summary>
                  A more natural way to say it <span>View feedback +</span>
                </summary>
                {latest.corrected_text && (
                  <p className="correction-pair">
                    <span>
                      You said:{" "}
                      {
                        messages.filter((m) => m.role === "user").at(-1)
                          ?.content
                      }
                    </span>
                    <strong lang="fr">{latest.corrected_text}</strong>
                  </p>
                )}
                <p>{latest.correction}</p>
                <button
                  className="text-button"
                  disabled={busy || listening}
                  onClick={() => setView("memory")}
                >
                  Check in my notebook <BookOpen size={14} />
                </button>
              </details>
            </aside>
          )}
          <section className="speaking-dock" aria-label="Your turn">
            <Composer
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
              <p className="quiet-notice">
                Speech unavailable · text chat available
              </p>
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
                Play response
              </button>
            )}
            {speech.speaking && (
              <button className="text-button" onClick={speech.stop}>
                Stop audio
              </button>
            )}
          </section>
          <div className="practice-extras">
            <details>
              <summary>Need a little inspiration?</summary>
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
                Transcript <span>{messages.length} messages</span>
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
        </main>
      )}
      {view === "summary" && (
        <main className="minimal-summary">
          <span className="overline">ONE CONVERSATION AT A TIME</span>
          <h1>
            Un petit pas.
            <br />
            <em>A little more confident.</em>
          </h1>
          <p>You made time for your French.</p>
          <div className="summary-stats">
            <span>
              <strong>
                {Math.floor(elapsed / 60)}:
                {String(elapsed % 60).padStart(2, "0")}
              </strong>{" "}
              this visit
            </span>
            <span>
              <strong>{turns}</strong> turns in this conversation
            </span>
          </div>
          <section>
            <h2>
              {examples.length
                ? "Words you put into practice"
                : "A few words for next time"}
            </h2>
            {(examples.length ? examples : scene.starters).map((text) => (
              <p lang="fr" key={text}>
                {text}
              </p>
            ))}
          </section>
          {messages.some((m) => m.correction) && (
            <section className="session-feedback">
              <h2>Your language notes</h2>
              {messages
                .filter((m) => m.correction)
                .map((m) => (
                  <div key={m.id}>
                    {m.corrected_text && <p lang="fr">{m.corrected_text}</p>}
                    <p>{m.correction}</p>
                  </div>
                ))}
              <button className="text-button" onClick={() => setView("memory")}>
                Open memory notebook <ArrowRight size={14} />
              </button>
            </section>
          )}
          <button className="primary-button" onClick={resume}>
            Keep talking <ArrowRight size={18} />
          </button>
          <button className="text-button" onClick={() => setView("home")}>
            Back to home
          </button>
        </main>
      )}
      <nav className="app-tabs" aria-label="Main navigation">
        {(
          [
            { id: "home", label: "Practice", icon: Mic },
            { id: "scenes", label: "Scenes", icon: Compass },
            { id: "memory", label: "Notebook", icon: BookOpen },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            disabled={busy || listening}
            aria-current={
              view === tab.id ||
              (tab.id === "home" && (view === "practice" || view === "summary"))
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
        <span>A little French, every day.</span>
        <span>
          {demo || mock
            ? "Demo · scripted replies & sample audio"
            : "Your own little corner of French."}
        </span>
      </footer>
    </div>
  );
}
