import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MessageList } from "../components/MessageList";
import type { Message } from "../lib/types";

const messages: Message[] = [
  { id: 1, role: "user", content: "Je suis aller au cinéma." },
  { id: 2, role: "assistant", content: "Quel film ?", correction: "用 être。", corrected_text: "Je suis allé au cinéma." },
];

describe("conversation learning interactions", () => {
  it("shows the correction under the learner, ahead of the AI answer", () => {
    const { container } = render(
      <MessageList messages={messages} busy={false} speechReady={true}
        language="zh" onSpeak={() => {}} onTranslate={async () => "翻译"} />
    );
    const user = container.querySelector(".message.user");
    const assistant = container.querySelector(".message.assistant");
    expect(user?.querySelector(".correction-capsule")).toBeTruthy();
    expect(user?.querySelector(".correction")).toBeNull();
    expect(assistant?.querySelector(".correction")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /更自然/ }));
    expect(user?.textContent).toContain("用 être。");
  });

  it("translates only on demand and can close the translation", async () => {
    const translate = vi.fn(async () => "看什么电影？");
    render(<MessageList messages={messages} busy={false}
      speechReady={true} language="zh" onSpeak={() => {}} onTranslate={translate} />);
    fireEvent.click(screen.getByRole("button", { name: /翻译/ }));
    await waitFor(() => expect(screen.getByText("看什么电影？")).toBeTruthy());
    expect(translate).toHaveBeenCalledExactlyOnceWith("Quel film ?", "zh");
    fireEvent.click(screen.getByRole("button", { name: /收起翻译/ }));
    expect(screen.queryByText("看什么电影？")).toBeNull();
  });
});


describe("three correction modes", () => {
  it("renders default error correction under the user's bubble and generates alternatives only on click", async () => {
    const rewrite = vi.fn(async (_text: string, style: "polite" | "local") => ({
      expression: style === "polite" ? "Pourriez-vous m'aider ?" : "Tu peux me filer un coup de main ?",
      explanation: style === "polite" ? "较礼貌" : "更口语",
    }));
    const save = vi.fn();
    const { container } = render(
      <MessageList messages={messages} busy={false} speechReady={true}
        language="zh" onSpeak={() => {}} onTranslate={async () => "翻译"}
        onSaveCorrection={save} onRewrite={rewrite} />
    );
    const learner = container.querySelector(".message.user");
    expect(learner?.querySelector(".correction-card")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /更自然/ }));
    expect(learner?.querySelector(".correction-card")).toBeTruthy();
    expect(learner?.querySelector("del")).toBeTruthy();
    expect(rewrite).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "更礼貌" }));
    await waitFor(() => expect(screen.getByText("Pourriez-vous m'aider ?")).toBeTruthy());
    expect(rewrite).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "更本土地道" }));
    await waitFor(() => expect(screen.getByText("Tu peux me filer un coup de main ?")).toBeTruthy());
    expect(rewrite).toHaveBeenCalledTimes(2);
    fireEvent.click(screen.getByRole("button", { name: "更礼貌" }));
    expect(rewrite).toHaveBeenCalledTimes(2);
  });
});


describe("collapsible feedback", () => {
  it("shows only one inline correction at a time and allows collapsing", () => {
    const twoTurns: Message[] = [
      ...messages,
      { id: 3, role: "user", content: "Une café, merci." },
      { id: 4, role: "assistant", content: "D'accord.", correction: "用 un。", corrected_text: "Un café, merci." },
    ];
    const view = render(<MessageList messages={twoTurns} busy={false} speechReady={true}
      language="zh" onSpeak={() => {}} onTranslate={async () => "翻译"} onSaveCorrection={() => {}} />);
    const pills = screen.getAllByRole("button", { name: /更自然/ });
    expect(view.container.querySelectorAll(".correction-card")).toHaveLength(0);
    fireEvent.click(pills[0]);
    expect(view.container.querySelectorAll(".correction-card")).toHaveLength(1);
    fireEvent.click(pills[1]);
    expect(view.container.querySelectorAll(".correction-card")).toHaveLength(1);
    fireEvent.click(pills[1]);
    expect(view.container.querySelectorAll(".correction-card")).toHaveLength(0);
  });
});
