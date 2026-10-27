"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { watchSilence, releaseSilence } from "../lib/silence";
import { api, ApiError } from "../lib/api";
import type { Transcript } from "../lib/types";

export function useRecorder(
  onTranscript: (value: Transcript) => void,
  onError: (message: string) => void,
  automatic = false,
) {
  const silenceCleanup = useRef<(() => void) | null>(null);
  const [listening, setListening] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const generation = useRef(0);
  const starting = useRef(false);

  const cancel = useCallback(() => {
    silenceCleanup.current?.();
    silenceCleanup.current = null;
    releaseSilence();
    generation.current++;
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
    if (recorder.current) {
      recorder.current.onstop = null;
      recorder.current.ondataavailable = null;
      recorder.current.onerror = null;
      if (recorder.current.state !== "inactive") recorder.current.stop();
    }
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    chunks.current = [];
    starting.current = false;
    setListening(false);
    setTranscribing(false);
  }, []);
  useEffect(() => cancel, [cancel]);

  async function toggle(sessionId: string) {
    if (listening) {
      if (recorder.current && recorder.current.state !== "inactive")
        recorder.current.stop();
      return;
    }
    if (starting.current || transcribing) return;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      onError("浏览器不支持录音，请改用文字输入。 / Recording unsupported.");
      return;
    }
    starting.current = true;
    const current = ++generation.current;
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (current !== generation.current) {
        mic.getTracks().forEach((track) => track.stop());
        return;
      }
      stream.current = mic;
      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
      ].find((format) => MediaRecorder.isTypeSupported(format));
      const rec = new MediaRecorder(mic, mimeType ? { mimeType } : undefined);
      recorder.current = rec;
      chunks.current = [];
      let size = 0;
      rec.ondataavailable = (event) => {
        size += event.data.size;
        if (size > 8 * 1024 * 1024) {
          cancel();
          onError("录音超过 8 MB，请缩短录音。 / Recording too large.");
        } else if (event.data.size) chunks.current.push(event.data);
      };
      rec.onerror = () => {
        cancel();
        onError("录音失败，请改用文字输入。 / Recording failed.");
      };
      rec.onstop = async () => {
        silenceCleanup.current?.();
        silenceCleanup.current = null;
        if (timer.current) clearTimeout(timer.current);
        mic.getTracks().forEach((track) => track.stop());
        stream.current = null;
        setListening(false);
        const blob = new Blob(chunks.current, {
          type: rec.mimeType || "audio/webm",
        });
        chunks.current = []; // No recording stored in localStorage or the database.
        if (!blob.size || current !== generation.current) return;
        setTranscribing(true);
        const abort = new AbortController();
        controller.current = abort;
        try {
          const result = await api.transcribe(sessionId, blob, abort.signal);
          if (current === generation.current) onTranscript(result);
        } catch (error) {
          if (current === generation.current)
            onError(
              (error instanceof ApiError ? `${error.message} ` : "") +
                "转写失败，请重试或使用文字输入。 / Transcription failed.",
            );
        } finally {
          if (current === generation.current) setTranscribing(false);
        }
      };
      rec.start(1000);
      if (automatic) {
        silenceCleanup.current = watchSilence(
          mic,
          () => {
            if (rec.state === "recording") rec.stop();
          },
          () => {
            cancel();
            onError(
              "没有检测到清晰语音，请在安静环境重新开始。 / No clear speech detected; restart in a quiet environment.",
            );
          },
        );
      }
      setListening(true);
      timer.current = setTimeout(() => {
        if (rec.state !== "inactive") rec.stop();
      }, 60000);
    } catch {
      if (current === generation.current) {
        cancel();
        onError("无法录音，请检查麦克风权限。 / Check microphone permission.");
      }
    } finally {
      starting.current = false;
    }
  }
  function finish() {
    if (recorder.current?.state === "recording") {
      recorder.current.stop();
      return true;
    }
    return false;
  }
  return { listening, transcribing, toggle, cancel, finish };
}
