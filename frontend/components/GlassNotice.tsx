import { useState } from "react";
import { VolumeX, X } from "lucide-react";
import type { Language } from "../lib/types";

/** Dismissing this presentation-only notice does not enable speech services. */
export function GlassNotice({
  children,
  language,
}: {
  children: React.ReactNode;
  language: Language;
}) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="glass-notice">
      <VolumeX size={18} aria-hidden="true" />
      <span role="status">{children}</span>
      <button
        type="button"
        aria-label={
          language === "en" ? "Dismiss speech notice" : "关闭语音提示"
        }
        onClick={() => setDismissed(true)}
      >
        <X size={17} />
      </button>
    </div>
  );
}
