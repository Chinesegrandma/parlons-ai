"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

export function useSpeech(client = api) {
  const [autoplay, setAutoplay] = useState(true);
  const [slow, setSlow] = useState(false);
  const [notice, setNotice] = useState("");
  const [working, setWorking] = useState(false);
  const reusable = useRef<HTMLAudioElement | null>(null);
  const completion = useRef<((success: boolean) => void) | null>(null);
  const [blocked, setBlocked] = useState(false);
  const player = useRef<HTMLAudioElement | null>(null);
  const objectUrl = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const generation = useRef(0);
  const rate = useRef(1);
  const autoplayEnabled = useRef(true);

  const stop = useCallback(() => {
    completion.current?.(false);
    completion.current = null;
    setWorking(false);
    generation.current++;
    controller.current?.abort();
    controller.current = null;
    if (player.current) {
      player.current.onended = null;
      player.current.onerror = null;
      player.current.pause();
      player.current.removeAttribute("src");
      player.current = null;
    }
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null;
    setBlocked(false);
  }, []);

  useEffect(() => {
    try {
      autoplayEnabled.current =
        localStorage.getItem("parlons-autoplay") !== "false";
      setAutoplay(autoplayEnabled.current);
      setSlow(localStorage.getItem("parlons-slow") === "true");
    } catch {
      // Preferences remain usable for this page when storage is unavailable.
    }
    return stop;
  }, [stop]);

  useEffect(() => {
    rate.current = slow ? 0.8 : 1;
    if (player.current) player.current.playbackRate = rate.current;
  }, [slow]);

  function preference(key: string, value: boolean) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Nonessential persistence.
    }
  }
  function toggleAutoplay(value: boolean) {
    autoplayEnabled.current = value;
    setAutoplay(value);
    preference("parlons-autoplay", value);
    if (!value) stop();
  }
  function toggleSlow(value: boolean) {
    setSlow(value);
    preference("parlons-slow", value);
  }

  async function playCurrent(current: number) {
    if (!player.current) return;
    setWorking(true);
    try {
      await player.current?.play();
      if (generation.current === current) {
        setBlocked(false);
        setNotice("");
      }
    } catch (error) {
      if (generation.current !== current) return;
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        error.name === "NotAllowedError"
      ) {
        completion.current?.(false);
        completion.current = null;
        setWorking(false);
        setBlocked(true);
        setNotice(
          "浏览器阻止了自动播放，请点击播放。 / Click Play response to listen.",
        );
      } else {
        stop();
        setNotice(
          "无法播放语音，你仍可阅读回复。 / Audio unavailable; text is still available.",
        );
      }
    }
  }

  async function speak(text: string, wait = false): Promise<boolean> {
    stop();
    setNotice("");
    setWorking(true);
    const current = generation.current;
    const abort = new AbortController();
    controller.current = abort;
    try {
      const blob = await client.synthesize(text, abort.signal);
      if (current !== generation.current) return false;
      const url = URL.createObjectURL(blob);
      objectUrl.current = url;
      const audio = reusable.current || new Audio(url);
      audio.src = url;
      audio.volume = 1;
      player.current = audio;
      audio.playbackRate = rate.current;
      const ended = new Promise<boolean>((resolve) => {
        completion.current = resolve;
      });
      audio.onended = () => {
        if (generation.current === current) {
          completion.current?.(true);
          completion.current = null;
          stop();
        }
      };
      audio.onerror = () => {
        if (generation.current !== current) return;
        stop();
        setNotice(
          "语音加载失败，可继续文字对话。 / Audio failed; text chat is available.",
        );
      };
      await playCurrent(current);
      if (wait) return await ended;
      return current === generation.current;
    } catch {
      if (current !== generation.current) return false;
      stop();
      setNotice(
        "语音服务暂不可用，可继续文字对话。 / Speech unavailable; text chat is available.",
      );
    }
    return false;
  }

  function unlock() {
    if (reusable.current) return;
    const bytes = Uint8Array.from(
      atob("UklGRiYAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQIAAACAgA=="),
      (char) => char.charCodeAt(0),
    );
    const silentUrl = URL.createObjectURL(
      new Blob([bytes], { type: "audio/wav" }),
    );
    const audio = new Audio(silentUrl);
    reusable.current = audio;
    audio.volume = 0;
    void audio
      .play()
      .then(() => {
        if (audio.volume === 0) {
          audio.pause();
          audio.volume = 1;
        }
      })
      .catch(() => {
        audio.volume = 1;
      })
      .finally(() => URL.revokeObjectURL(silentUrl));
  }

  async function playResponse(text: string, ready: boolean) {
    if (autoplayEnabled.current && ready) await speak(text);
  }
  return {
    autoplay,
    working,
    unlock,
    speakAndWait: (text: string) => speak(text, true),
    slow,
    notice,
    blocked,
    stop,
    speak,
    playResponse,
    toggleAutoplay,
    toggleSlow,
    retry: () => playCurrent(generation.current),
  };
}
