import { useEffect, useRef, useState, type ReactNode } from "react";
import { BookOpen, X } from "lucide-react";
import type { Language, LookupResult } from "../lib/types";

type Choice = { text: string; context: string };
/** Convert a caret into a whole French word, preserving accents, apostrophes and hyphens. */
export function wordAt(text: string, offset: number): string {
  for (const match of text.matchAll(
    /[\p{L}\p{M}]+(?:[’'\-][\p{L}\p{M}]+)*/gu,
  )) {
    const start = match.index!;
    if (offset >= start && offset < start + match[0].length) return match[0];
  }
  return "";
}
export function WordLookup({
  language,
  onLookup,
  children,
}: {
  language: Language;
  children: ReactNode;
  onLookup?: (
    text: string,
    context: string,
    language: Language,
  ) => Promise<LookupResult>;
}) {
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [result, setResult] = useState<{
    key: string;
    value: LookupResult;
  } | null>(null);
  const [pending, setPending] = useState("");
  const [failed, setFailed] = useState("");
  const cache = useRef(new Map<string, LookupResult>());
  const version = useRef(0);
  const key = JSON.stringify([language, choice?.text, choice?.context]);
  const activeKey = useRef(key);
  activeKey.current = key;
  const t = (zh: string, en: string) => (language === "en" ? en : zh);
  function choose(text: string, element: HTMLElement) {
    const context = element.textContent?.trim() || "";
    if (
      !text ||
      text.length > 200 ||
      context.length > 2000 ||
      !context.includes(text)
    )
      return;
    trigger.current = element;
    setChoice({ text, context });
  }
  function close() {
    version.current++;
    setChoice(null);
    setPending("");
    trigger.current?.focus({ preventScroll: true });
  }
  useEffect(() => {
    const select = () => {
      const selection = window.getSelection();
      if (
        !selection ||
        selection.isCollapsed ||
        !selection.anchorNode ||
        !selection.focusNode
      )
        return;
      const anchor =
        selection.anchorNode instanceof Element
          ? selection.anchorNode
          : selection.anchorNode.parentElement;
      const element = anchor?.closest<HTMLElement>("[data-lookup-text]");
      if (
        !element ||
        !root.current?.contains(element) ||
        !element.contains(selection.focusNode)
      )
        return;
      choose(selection.toString().trim(), element);
    };
    document.addEventListener("selectionchange", select);
    return () => document.removeEventListener("selectionchange", select);
  }, []);
  async function lookup() {
    if (!choice || !onLookup) return;
    const cached = cache.current.get(key);
    if (cached) {
      setResult({ key, value: cached });
      return;
    }
    const request = ++version.current;
    setPending(key);
    setFailed("");
    try {
      const value = await onLookup(choice.text, choice.context, language);
      cache.current.set(key, value);
      if (request === version.current && activeKey.current === key)
        setResult({ key, value });
    } catch {
      if (request === version.current && activeKey.current === key)
        setFailed(key);
    } finally {
      if (request === version.current) setPending("");
    }
  }
  return (
    <div
      className="lookup-surface"
      ref={root}
      onKeyDown={(event) => {
        if (event.key === "Escape") close();
        if (
          event.key !== "Enter" ||
          (event.target as HTMLElement).closest("button")
        )
          return;
        const element = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-lookup-text]",
        );
        if (element) {
          event.preventDefault();
          const selected = window.getSelection()?.toString().trim();
          choose(selected || wordAt(element.textContent || "", 0), element);
        }
      }}
      onPointerUp={(event) => {
        const element = (event.target as HTMLElement).closest<HTMLElement>(
          "[data-lookup-text]",
        );
        if (!element) return;
        const selection = window.getSelection();
        if (selection && !selection.isCollapsed) {
          if (
            selection.anchorNode &&
            selection.focusNode &&
            element.contains(selection.anchorNode) &&
            element.contains(selection.focusNode)
          )
            choose(selection.toString().trim(), element);
          return;
        }
        const doc = document as Document & {
          caretPositionFromPoint?: (
            x: number,
            y: number,
          ) => { offsetNode: Node; offset: number } | null;
          caretRangeFromPoint?: (x: number, y: number) => Range | null;
        };
        const caret = doc.caretPositionFromPoint?.(
          event.clientX,
          event.clientY,
        );
        const range = doc.caretRangeFromPoint?.(event.clientX, event.clientY);
        const node = caret?.offsetNode || range?.startContainer;
        const offset = caret?.offset ?? range?.startOffset;
        if (!node || offset == null || !element.contains(node)) return;
        const prefix = document.createRange();
        prefix.selectNodeContents(element);
        prefix.setEnd(node, offset);
        choose(
          wordAt(element.textContent || "", prefix.toString().length),
          element,
        );
      }}
    >
      {children}
      {onLookup && choice && (
        <aside
          className="word-lookup"
          role="dialog"
          aria-modal="false"
          aria-live="polite"
          aria-label={t("词语与短语查义", "Word and phrase lookup")}
        >
          <header>
            <BookOpen size={17} />
            <strong lang="fr">{choice.text}</strong>
            <button
              type="button"
              aria-label={t("关闭查词", "Close lookup")}
              onClick={close}
            >
              <X size={18} />
            </button>
          </header>
          {result?.key === key || cache.current.has(key) ? (
            <>
              <p>
                {
                  (result?.key === key ? result.value : cache.current.get(key))
                    ?.meaning
                }
              </p>
              {(result?.key === key ? result.value : cache.current.get(key))
                ?.example && (
                <p lang="fr">
                  {
                    (result?.key === key
                      ? result.value
                      : cache.current.get(key)
                    )?.example
                  }
                </p>
              )}
            </>
          ) : (
            <>
              <p>
                {t(
                  "按这句话中的用法解释。点击查询才会调用 AI。",
                  "Explain its meaning in this sentence. AI is called only when you look it up.",
                )}
              </p>
              {failed === key && (
                <p role="alert">
                  {t("查询失败，请重试。", "Lookup failed. Please retry.")}
                </p>
              )}
              <button
                type="button"
                disabled={pending === key}
                onClick={() => void lookup()}
              >
                {pending === key
                  ? t("查询中…", "Looking up…")
                  : t("查询含义", "Look up meaning")}
              </button>
            </>
          )}
        </aside>
      )}
    </div>
  );
}
