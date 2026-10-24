"use client";
import { useEffect, useState } from "react";
import {
  collectMemories,
  defaults,
  type Notebook,
  type Memory,
  reviewMemory,
} from "../lib/learning";
import type { PracticeOptions, Session } from "../lib/types";
export function useLearning(demo: boolean, session: Session | null) {
  const prefix = demo ? "parlons-demo-learning" : "parlons-learning";
  const [options, setOptions] = useState<PracticeOptions>(defaults);
  const [voice, setVoice] = useState("default");
  const [book, setBook] = useState<Notebook>({ cards: [], seen: [] });
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(prefix) || "null");
      if (
        saved?.book &&
        Array.isArray(saved.book.cards) &&
        Array.isArray(saved.book.seen)
      )
        setBook(saved.book);
      if (saved?.options) setOptions({ ...defaults, ...saved.options });
      if (typeof saved?.voice === "string") setVoice(saved.voice);
    } catch {
      setStorageError(
        "Saved preferences could not be read. This visit still works.",
      );
    }
    setReady(true);
  }, [prefix]);
  useEffect(() => {
    if (ready && session)
      setBook((previous) => collectMemories(previous, session));
  }, [ready, session]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(prefix, JSON.stringify({ options, voice, book }));
    } catch {
      setStorageError(
        "Your browser could not save the notebook. Keep this page open or export your notes.",
      );
    }
  }, [ready, prefix, options, voice, book]);
  const update = (id: string, change: Partial<Memory>) =>
    setBook((b) => ({
      ...b,
      cards: b.cards.map((c) => (c.id === id ? { ...c, ...change } : c)),
    }));
  const remove = (id: string) =>
    setBook((b) => ({ ...b, cards: b.cards.filter((c) => c.id !== id) }));
  const review = (id: string, remembered: boolean) =>
    setBook((b) => ({
      ...b,
      cards: b.cards.map((c) =>
        c.id === id ? reviewMemory(c, remembered) : c,
      ),
    }));
  const add = (text: string) =>
    setBook((b) => ({
      ...b,
      cards: [
        {
          id: crypto.randomUUID(),
          kind: "expression",
          original: text,
          sent: text,
          corrected: text,
          explanation: "Saved by you",
          prompt: "Use this expression in a new sentence.",
          topic: session?.topic || "daily",
          scene: session?.options?.scene || "My expression",
          occurrences: 1,
          accepted: true,
          reviews: 0,
          due: Date.now(),
          created: Date.now(),
        },
        ...b.cards,
      ],
    }));
  return {
    options,
    setOptions,
    voice,
    setVoice,
    book,
    update,
    remove,
    review,
    add,
    storageError,
    ready,
  };
}
