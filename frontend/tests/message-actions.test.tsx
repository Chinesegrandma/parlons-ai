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
    expect(user?.querySelector(".correction")).toBeTruthy();
    expect(assistant?.querySelector(".correction")).toBeNull();
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
