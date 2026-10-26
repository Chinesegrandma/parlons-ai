"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, AudioLines, Mic, Pause } from "lucide-react";
import { StudioHeader, PracticeSettings } from "./AppChrome";
import { AssistantAvatar, ASSISTANT_NAME } from "./AssistantAvatar";
import { Composer } from "./Composer";
import { MessageList } from "./MessageList";
import { PracticeHome } from "./PracticeHome";
import { ReviewPanel } from "./ReviewPanel";
import { useLearning } from "../hooks/useLearning";
import { NotebookPanel } from "./NotebookPanel";
import { InstallApp } from "./InstallApp";
import { useConversation } from "../hooks/useConversation";
import { useRecorder } from "../hooks/useRecorder";
import { useSpeech } from "../hooks/useSpeech";
import { GlassNotice } from "./GlassNotice";
import { prepareSilence } from "../lib/silence";
import { useLanguage } from "../lib/language";
import { api } from "../lib/api";
import { demoApi } from "../lib/demo";
import { catalog } from "../lib/catalog";
import type {
  Health,
  PracticeMode,
  Review,
  Topic,
  Transcript,
  Voice,
  PracticeOptions,
} from "../lib/types";

type Phase = "idle" | "listening" | "thinking" | "speaking" | "paused";
export function Studio({ demo = false }: { demo?: boolean }) {
  const client = demo ? demoApi : api;
  const { language, setLanguage, t } = useLanguage();
  const conversation = useConversation(
    client,
    demo ? "parlons-demo-session" : "parlons-session",
    false,
  );
  const learning = useLearning(demo, conversation.session, language);
  const [voices, setVoices] = useState<Voice[]>([]);
  const speech = useSpeech(
    client,
    voices.some((item) => item.id === learning.voice)
      ? learning.voice
      : "default",
  );
  const [canResume, setCanResume] = useState(false);
  const [page, setPage] = useState<"home" | "chat" | "notebook">("home");
  const [mode, setMode] = useState<PracticeMode>("guided");
  const [settings, setSettings] = useState(false);
  const [health, setHealth] = useState<Health | null>(null);
  const [offline, setOffline] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [pausing, setPausing] = useState(false);
  const pauseAfterTurn = useRef(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const playedOpenings = useRef(new Set<string>());
  const [demoListening, setDemoListening] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const reviewController = useRef<AbortController | null>(null);
  const running = useRef(false);
  const epoch = useRef(0);
  const pending = useRef<Promise<string | null> | null>(null);
  const recorder = useRecorder(
    receivedTranscript,
    recordingError,
    mode === "conversation",
  );
  const session = conversation.session;
  const scene = catalog.find((item) => item.id === session?.topic);
  const busy = conversation.busy || recorder.transcribing;
  const speechReady = health?.speech_ready ?? false;
  const turns =
    session?.messages.filter((message) => message.role === "user").length || 0;

  useEffect(() => {
    try {
      setCanResume(
        Boolean(
          session ||
          localStorage.getItem(
            demo ? "parlons-demo-session" : "parlons-session",
          ),
        ),
      );
    } catch {
      setCanResume(Boolean(session));
    }
  }, [session, demo]);
  useEffect(() => {
    let active = true;
    client
      .voices()
      .then((result) => {
        if (active) setVoices(result.voices);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [client]);
  useEffect(() => {
    let active = true;
    client
      .health()
      .then((value) => {
        if (active) {
          setHealth(value);
          setOffline(false);
        }
      })
      .catch(() => {
        if (active) setOffline(true);
      });
    return () => {
      active = false;
    };
  }, [client]);
  useEffect(() => {
    if (
      !session ||
      session.id !== openingId ||
      !health ||
      playedOpenings.current.has(session.id)
    )
      return;
    playedOpenings.current.add(session.id);
    setOpeningId(null);
    const opening = session.messages.find(
      (message) => message.role === "assistant",
    );
    if (opening) void speech.playResponse(opening.content, speechReady);
    // Only the chosen session opening is played; render changes never repeat it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, openingId, health, speechReady]);
  useEffect(() => {
    if (
      !voiceActive ||
      phase !== "idle" ||
      !session ||
      busy ||
      speech.working ||
      speech.blocked ||
      recorder.listening
    )
      return;
    setPhase("listening");
    void recorder.toggle(session.id);
    // The phase transition reserves a single recording before state updates arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    voiceActive,
    phase,
    session?.id,
    busy,
    speech.working,
    speech.blocked,
    recorder.listening,
  ]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) pauseVoice();
    };
    const currentEpoch = epoch;
    document.addEventListener("visibilitychange", hide);
    return () => {
      running.current = false;
      currentEpoch.current++;
      reviewController.current?.abort();
      document.removeEventListener("visibilitychange", hide);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function localizedError(message: string) {
    if (language === "zh") return message.split(" / ")[0];
    const categories: Record<string, string> = {
      authentication: "API key authentication failed.",
      permission: "Access denied. Check API permissions.",
      billing: "Check the provider billing and credits.",
      quota_or_rate_limit: "Quota or rate limit reached.",
      connection: "Connection failed. Check your computer’s network and proxy.",
      timeout: "The request timed out.",
      invalid_response: "The service returned an unexpected response.",
      request_rejected:
        "Request rejected. Check the voice, model and audio format.",
      upstream:
        "The speech provider returned an error. Please try again later.",
      internal: "Speech playback failed. Check the local configuration.",
    };
    const category = Object.keys(categories).find((key) =>
      message.includes(`[${key}`),
    );
    return category
      ? `${message.match(/^ElevenLabs \[[^\]]+\]/)?.[0] || ""} ${categories[category]}`.trim()
      : message.includes(" / ")
        ? message.split(" / ").at(-1)!
        : /[\u4e00-\u9fff]/.test(message)
          ? "The request failed. Your draft is retained; check the service and retry."
          : message;
  }
  function pauseVoice() {
    pauseAfterTurn.current = false;
    setPausing(false);
    running.current = false;
    epoch.current++;
    setOpeningId(null);
    setVoiceActive(false);
    setPhase("paused");
    recorder.cancel();
    speech.stop();
  }
  function requestPause() {
    if (pausing) {
      pauseVoice();
      return;
    }
    if (recorder.listening || recorder.transcribing || phase === "thinking") {
      pauseAfterTurn.current = true;
      setPausing(true);
      if (recorder.listening) recorder.finish();
      return;
    }
    pauseVoice();
  }
  function recordingError(message: string) {
    pauseVoice();
    conversation.setError(message);
  }
  async function receivedTranscript(value: Transcript) {
    if (!running.current) {
      conversation.acceptTranscript(value);
      return;
    }
    const current = epoch.current;
    setPhase("thinking");
    conversation.acceptTranscript(value);
    const request = conversation.send({
      text: value.original_text,
      transcriptId: value.id,
      language,
      practice_mode: "conversation",
    });
    pending.current = request;
    const reply = await request;
    if (current !== epoch.current || !running.current) return;
    if (!reply) {
      pauseVoice();
      return;
    }
    setPhase("speaking");
    const played = await speech.speakAndWait(reply);
    if (current !== epoch.current || !running.current) return;
    if (!played) {
      running.current = false;
      pauseAfterTurn.current = false;
      setPausing(false);
      recorder.cancel();
      setVoiceActive(false);
      setPhase("paused");
      return;
    }
    if (pauseAfterTurn.current) pauseVoice();
    else setPhase("idle");
  }
  function cancelReview() {
    reviewController.current?.abort();
    setReviewLoading(false);
    setShowReview(false);
    setReview(null);
    setReviewError("");
  }
  async function begin(topic?: Topic, extra?: Partial<PracticeOptions>) {
    pauseVoice();
    const current = epoch.current;
    speech.unlock();
    cancelReview();
    setDemoListening(false);
    setPage("chat");
    const target = catalog.find((item) => item.id === topic);
    const options: PracticeOptions = {
      ...learning.options,
      scene: target?.[language] || "",
      situation: "",
      goals: [],
      review_targets: [],
      explanation_language: language === "en" ? "English" : "Chinese",
      feedback: mode === "conversation" ? "after_session" : "each_turn",
      ...extra,
    };
    const result = await conversation.start(topic, topic ? options : undefined);
    if (current === epoch.current && result?.messages.length === 1)
      setOpeningId(result.id);
  }
  function switchMode(value: PracticeMode) {
    pauseVoice();
    setDemoListening(false);
    setMode(value);
  }
  async function send() {
    if (busy || recorder.listening || demoListening || voiceActive) return;
    cancelReview();
    speech.unlock();
    speech.stop();
    const current = epoch.current;
    const request = conversation.send({
      text: conversation.input,
      transcriptId: conversation.transcript?.id,
      language,
      practice_mode: mode,
    });
    pending.current = request;
    const reply = await request;
    if (reply && current === epoch.current)
      await speech.playResponse(reply, speechReady);
  }
  function record() {
    cancelReview();
    speech.unlock();
    speech.stop();
    if (demo) {
      if (demoListening)
        conversation.acceptTranscript({
          id: "demo-transcript",
          original_text: "Je voudrais un café, s’il vous plaît.",
        });
      setDemoListening(!demoListening);
    } else if (session) void recorder.toggle(session.id);
  }
  function startVoice() {
    if (
      demo ||
      !session ||
      busy ||
      conversation.input.trim() ||
      speech.working ||
      speech.blocked
    )
      return;
    cancelReview();
    try {
      prepareSilence();
    } catch {
      conversation.setError(
        t(
          "当前浏览器不支持自动检测停顿，请使用逐句练习。",
          "Automatic turn detection is unavailable; use guided practice.",
        ),
      );
      return;
    }
    speech.unlock();
    conversation.setError("");
    epoch.current++;
    running.current = true;
    setVoiceActive(true);
    setPhase("idle");
  }
  async function finishReview() {
    const id = session?.id;
    pauseVoice();
    if (!id) return;
    reviewController.current?.abort();
    const abort = new AbortController();
    reviewController.current = abort;
    setShowReview(true);
    setReviewLoading(true);
    setReviewError("");
    setReview(null);
    try {
      await pending.current;
      if (abort.signal.aborted) return;
      const result = await client.review(id, language, abort.signal);
      if (!abort.signal.aborted) setReview(result);
    } catch (error) {
      if (!abort.signal.aborted)
        setReviewError(
          localizedError(
            error instanceof Error
              ? error.message
              : t("总结暂不可用。", "Review unavailable."),
          ),
        );
    } finally {
      if (!abort.signal.aborted) setReviewLoading(false);
    }
  }
  const status = pausing
    ? t("正在处理这句话，回复后暂停…", "Finishing this turn, then pausing…")
    : phase === "listening"
      ? recorder.transcribing
        ? t("正在转写这句话…", "Transcribing your turn…")
        : recorder.listening
          ? t(
              "正在听你说… 停顿后自动发送",
              "Listening… pause to send automatically",
            )
          : t(
              "正在请求麦克风，请允许录音…",
              "Waiting for microphone permission…",
            )
      : phase === "thinking"
        ? t("正在准备回复…", "Preparing a reply…")
        : phase === "speaking"
          ? t(
              "正在朗读，听完后会继续录音",
              "Speaking. Listening resumes after the reply.",
            )
          : t("准备好时，开启连续对话。", "Start when you are ready.");
  return (
    <div
      className={`parlons-app ${page === "chat" ? "sage-conversation" : ""}`}
    >
      <div className="sage-atmosphere" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <StudioHeader
        language={language}
        status={
          offline
            ? t("连接暂不可用", "Connection unavailable")
            : !health
              ? t("连接中", "Connecting")
              : demo || health.mock_ai
                ? t("模拟体验", "Demo mode")
                : health.mode === "ai"
                  ? t("真实练习", "Live practice")
                  : t("文字体验", "Text demo")
        }
        offline={offline}
        privateSite={Boolean(health?.private_site)}
        settings={settings}
        onHome={() => {
          pauseVoice();
          cancelReview();
          setPage("home");
        }}
        onNotebook={() => {
          pauseVoice();
          cancelReview();
          setPage("notebook");
        }}
        onSettings={() => setSettings(!settings)}
      />
      {settings && (
        <PracticeSettings
          language={language}
          options={learning.options}
          onOptions={learning.setOptions}
          voices={voices}
          voice={learning.voice}
          onVoice={(value) => {
            pauseVoice();
            learning.setVoice(value);
          }}
          autoplay={speech.autoplay}
          slow={speech.slow}
          onClose={() => setSettings(false)}
          onLanguage={(value) => {
            pauseVoice();
            cancelReview();
            setLanguage(value);
          }}
          onAutoplay={speech.toggleAutoplay}
          onSlow={speech.toggleSlow}
        />
      )}
      {page === "notebook" ? (
        <NotebookPanel
          language={language}
          learning={learning}
          onBack={() => setPage("home")}
          speechReady={speechReady}
          onSpeak={(text) => {
            speech.unlock();
            void speech.speak(text);
          }}
          onPractice={(card) =>
            void begin(card.topic, {
              scene: t("复习表达", "Review an expression"),
              situation:
                "Propose une nouvelle situation pour pratiquer une expression déjà apprise.",
              review_targets: [card.corrected || card.sent],
            })
          }
        />
      ) : page === "home" ? (
        <PracticeHome
          onCustom={(text) =>
            void begin("daily", {
              scene: t("自定义情境", "Your scenario"),
              situation: text,
            })
          }
          canResume={canResume}
          language={language}
          disabled={busy}
          onStart={(topic) => void begin(topic)}
          onResume={() => void begin()}
        />
      ) : (
        <main className="conversation-page">
          {health && !speechReady && (
            <GlassNotice language={language}>
              {t(
                "语音暂不可用，仍可使用文字对话。",
                "Speech unavailable. You can still chat by text.",
              )}
            </GlassNotice>
          )}
          <div className="chat-heading">
            <button
              className="back-scenes"
              onClick={() => {
                pauseVoice();
                setPage("home");
              }}
            >
              <ArrowLeft size={17} />
              {t("场景", "Scenes")}
            </button>
            <div>
              <span className="eyebrow">PARLONS FRANÇAIS</span>
              <h1>
                {session?.options?.situation
                  ? session.options.review_targets?.length
                    ? t("复习表达", "Review an expression")
                    : t("自定义情境", "Your scenario")
                  : scene?.[language] || t("自由聊天", "Free chat")}
              </h1>
            </div>
            <button
              className="end-review"
              disabled={reviewLoading || (!turns && !conversation.busy)}
              onClick={() => void finishReview()}
            >
              {t("结束并总结", "Finish & review")}
            </button>
          </div>
          <div className="assistant-identity">
            <AssistantAvatar size={48} language={language} />
            <div>
              <strong>{ASSISTANT_NAME}</strong>
              <small>
                {t("你的 AI 法语女助理", "Your AI French assistant")}
              </small>
            </div>
          </div>
          <div
            className="mode-switch"
            aria-label={t("对话模式", "Practice mode")}
          >
            <button
              aria-pressed={mode === "guided"}
              onClick={() => switchMode("guided")}
            >
              {t("逐句练习", "Guided practice")}
            </button>
            <button
              aria-pressed={mode === "conversation"}
              onClick={() => switchMode("conversation")}
            >
              {t("连续对话", "Conversation")}
            </button>
          </div>
          <p className="mode-description">
            {mode === "guided"
              ? t(
                  "录音后检查转写再发送，边聊边看反馈。",
                  "Review your transcript before sending. Get feedback as you go.",
                )
              : t(
                  "开启一次，说完停顿即可自动发送。AI 说完后继续听你说，结束时统一总结。",
                  "Start once. Pause to send; listening resumes after each reply. Review feedback at the end.",
                )}
          </p>
          {mode === "conversation" && (
            <section
              className={`voice-session ${voiceActive ? "active" : ""}`}
              aria-label={t("连续语音对话", "Hands-free conversation")}
            >
              <div className="voice-orb">
                <AudioLines size={28} />
              </div>
              <div>
                <strong role="status">{status}</strong>
                <small>
                  {demo
                    ? t(
                        "离线演示不启动麦克风，可在下方打字体验。",
                        "The offline demo does not use the microphone; type below to try it.",
                      )
                    : t(
                        "播放时不会录音。切换模式、离开页面或暂停会关闭麦克风。",
                        "The microphone is off during playback. Pause, switch mode or leave to stop recording.",
                      )}
                </small>
              </div>
              <button
                disabled={
                  demo ||
                  !health?.stt_ready ||
                  !speechReady ||
                  (!voiceActive &&
                    (busy ||
                      !!conversation.input.trim() ||
                      speech.working ||
                      speech.blocked))
                }
                onClick={() => (voiceActive ? requestPause() : startVoice())}
              >
                {voiceActive ? <Pause size={18} /> : <Mic size={18} />}
                {voiceActive
                  ? pausing
                    ? t("取消处理", "Cancel")
                    : t("暂停", "Pause")
                  : t("开启连续对话", "Start conversation")}
              </button>
            </section>
          )}
          <section
            className="focused-chat"
            aria-label={t("法语对话", "French conversation")}
          >
            <MessageList
              messages={session?.messages || []}
              busy={busy}
              busyLabel={
                recorder.transcribing
                  ? t("正在转写…", "Transcribing…")
                  : t("正在准备回复…", "Preparing a reply…")
              }
              speechReady={speechReady && !voiceActive}
              language={language}
              hideCorrections={mode === "conversation"}
              onSaveCorrection={learning.saveCorrection}
              savedCorrectionIds={
                session?.messages
                  .filter((message) =>
                    learning.book.cards.some(
                      (card) =>
                        card.accepted &&
                        card.id === `${session.id}:${message.id}`,
                    ),
                  )
                  .map((message) => message.id) || []
              }
              onSpeak={(text) => {
                pauseVoice();
                speech.unlock();
                void speech.speak(text);
              }}
            />
            {speech.blocked && (
              <button
                className="retry-audio"
                onClick={() => void speech.retry()}
              >
                {t(
                  "浏览器暂停了声音，点此播放",
                  "Your browser blocked audio. Tap to play.",
                )}
              </button>
            )}
            {speech.notice && (
              <GlassNotice key={speech.notice} language={language}>
                {localizedError(speech.notice)}
              </GlassNotice>
            )}
            {!voiceActive && (
              <Composer
                hideMicrophone={mode === "conversation"}
                language={language}
                transcribing={recorder.transcribing}
                input={conversation.input}
                transcript={conversation.transcript}
                disabled={busy || !session}
                listening={demo ? demoListening : recorder.listening}
                sttReady={health?.stt_ready ?? false}
                error={localizedError(conversation.error)}
                onChange={conversation.setInput}
                onRecord={record}
                onSend={() => void send()}
                onDiscard={conversation.discard}
                demo={demo}
              />
            )}
            {voiceActive && conversation.error && (
              <p role="alert">{localizedError(conversation.error)}</p>
            )}
          </section>
          {showReview && (
            <ReviewPanel
              review={review}
              language={language}
              loading={reviewLoading}
              error={reviewError}
              onClose={() => {
                reviewController.current?.abort();
                setReviewLoading(false);
                setShowReview(false);
              }}
            />
          )}
          <p className="practice-footnote">
            {demo || health?.mock_ai
              ? t(
                  "模拟回复与提示音，不评估真实语言质量。",
                  "Scripted replies and tones, not a real language evaluation.",
                )
              : t(
                  "语音与回复会使用你的 API 额度。连续模式每轮会自动调用服务。",
                  "Speech and replies use API credits. Conversation mode calls services automatically each turn.",
                )}
          </p>
        </main>
      )}
      {page === "home" && (
        <div className="app-install">
          <InstallApp language={language} />
        </div>
      )}
      <footer className="app-bottom">
        UN PEU, CHAQUE JOUR.{" "}
        <span>
          {t(
            "少一点犹豫，多一点表达。",
            "A little less hesitation. A little more conversation.",
          )}
        </span>
      </footer>
    </div>
  );
}
