"use client";
import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Composer } from "../components/Composer";
import { MessageList } from "../components/MessageList";
import { PlaybackControls } from "../components/PlaybackControls";
import { TopicSidebar } from "../components/TopicSidebar";
import { useConversation } from "../hooks/useConversation";
import { useRecorder } from "../hooks/useRecorder";
import { useSpeech } from "../hooks/useSpeech";
import { api } from "../lib/api";
import { topics, type Health, type Topic } from "../lib/types";

export default function Home() {
  const conversation = useConversation();
  const speech = useSpeech();
  const recorder = useRecorder(
    conversation.acceptTranscript,
    conversation.setError,
  );
  const [health, setHealth] = useState<Health | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    let active = true;
    api
      .health()
      .then((value) => {
        if (active) setHealth(value);
      })
      .catch(() => {
        if (active) setOffline(true);
      });
    return () => {
      active = false;
    };
  }, []);
  const busy = conversation.busy || recorder.transcribing;
  const topic = conversation.session?.topic || "daily";
  const speechReady = health?.speech_ready ?? false;

  async function send() {
    speech.stop();
    const reply = await conversation.send();
    if (reply) await speech.playResponse(reply, speechReady);
  }
  function start(nextTopic?: Topic) {
    speech.stop();
    recorder.cancel();
    void conversation.start(nextTopic);
  }
  return (
    <main className="shell">
      <TopicSidebar
        topic={topic}
        disabled={busy || recorder.listening}
        onSelect={start}
      />
      <section className="main">
        <header className="header">
          <div>
            <div className="eyebrow">YOUR PERSONAL FRENCH TUTOR</div>
            <h1>
              Parlons français <span>✳</span>
            </h1>
            <p>Practice naturally. Improve with confidence.</p>
          </div>
          <div className="status">
            {offline
              ? "Backend offline"
              : !health
                ? "Connecting…"
                : health.mode === "mock"
                  ? "Mock mode · synthetic audio"
                  : health.mode === "ai"
                    ? "AI connected"
                    : "Text demo mode"}
          </div>
        </header>
        <div className="sessionbar">
          <strong>{topics.find((item) => item.id === topic)?.name}</strong>
          <button
            disabled={busy || recorder.listening}
            onClick={() => start(conversation.session ? topic : undefined)}
          >
            <RotateCcw size={16} />
            {conversation.session ? "New session" : "Retry connection"}
          </button>
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
        <MessageList
          messages={conversation.session?.messages || []}
          busy={busy}
          speechReady={speechReady}
          onSpeak={(text) => void speech.speak(text)}
        />
        <Composer
          input={conversation.input}
          transcript={conversation.transcript}
          disabled={busy || !conversation.session}
          listening={recorder.listening}
          sttReady={health?.stt_ready ?? false}
          error={conversation.error}
          onChange={conversation.setInput}
          onRecord={() => {
            speech.stop();
            if (conversation.session)
              void recorder.toggle(conversation.session.id);
          }}
          onSend={() => void send()}
          onDiscard={conversation.discard}
        />
      </section>
    </main>
  );
}
