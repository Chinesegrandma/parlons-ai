import { BookOpen, Check } from "lucide-react";

/** Word-level LCS: keep shared words quiet, highlight only substitutions/insertions. */
export function changedWords(original: string, corrected: string) {
  const a = original.split(/(\s+)/),
    b = corrected.split(/(\s+)/);
  const rows = Array.from(
    { length: a.length + 1 },
    () => new Uint16Array(b.length + 1),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      rows[i][j] =
        a[i] === b[j]
          ? rows[i + 1][j + 1] + 1
          : Math.max(rows[i + 1][j], rows[i][j + 1]);
  const sharedA = new Set<number>(),
    sharedB = new Set<number>();
  let i = 0,
    j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      sharedA.add(i++);
      sharedB.add(j++);
    } else if (rows[i + 1][j] >= rows[i][j + 1]) i++;
    else j++;
  }
  return {
    original: a.map((text, index) => ({
      text,
      changed: !sharedA.has(index) && !!text.trim(),
    })),
    corrected: b.map((text, index) => ({
      text,
      changed: !sharedB.has(index) && !!text.trim(),
    })),
  };
}
export function CorrectionCard({
  original,
  corrected,
  explanation,
  saved,
  onSave,
}: {
  original: string;
  corrected: string;
  explanation: string;
  saved: boolean;
  onSave: () => void;
}) {
  const words = changedWords(original, corrected);
  return (
    <aside className="correction-card" aria-label="本轮纠错">
      <div>
        <span>你说的</span>
        <p lang="fr">
          {words.original.map((w, i) =>
            w.changed ? <mark key={i}>{w.text}</mark> : w.text,
          )}
        </p>
      </div>
      {corrected && (
        <div>
          <span>更自然的说法</span>
          <p lang="fr">
            {words.corrected.map((w, i) =>
              w.changed ? <mark key={i}>{w.text}</mark> : w.text,
            )}
          </p>
        </div>
      )}
      <p className="correction-explanation">{explanation}</p>
      <button className="text-button" disabled={saved} onClick={onSave}>
        {saved ? <Check size={15} /> : <BookOpen size={15} />}
        {saved ? "已收进笔记本" : "收进笔记本"}
      </button>
    </aside>
  );
}
