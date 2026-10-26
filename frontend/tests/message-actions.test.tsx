import { describe, it, expect, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MessageList } from "../components/MessageList";
import type { Message } from "../lib/types";

const messages: Message[] = [
  { id: 1, role: "user", content: "Je voudrais une café." },
  {
    id: 2,
    role: "assistant",
    content: "Et avec ça ?",
    correction: "café 是阳性名词。",
    corrected_text: "Je voudrais un café.",
  },
];
const defaults = {
  messages,
  busy: false,
  speechReady: true,
  language: "zh" as const,
  onSpeak: () => {},
  onTranslate: async () => "还需要什么？",
};

describe("inline learning", () => {
  it("starts collapsed and attaches the learning card below the learner, not the assistant", () => {
    const { container } = render(<MessageList {...defaults} />);
    expect(screen.queryByRole("complementary")).toBeNull();
    const preview = screen.getByRole("button", { name: /查看解释和其他表达/ });
    expect(preview).toHaveTextContent("Je voudrais un café.");
    expect(preview.querySelector("mark")).toHaveTextContent("un");
    expect(screen.queryByText(/一个小建议/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /查看解释和其他表达/ }));
    expect(
      container.querySelector(".message.user .correction-card"),
    ).toBeTruthy();
    expect(
      container.querySelector(".message.assistant .correction-card"),
    ).toBeNull();
    expect(screen.getByText("café 是阳性名词。")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "收起学习卡" }));
    expect(screen.queryByRole("complementary")).toBeNull();
  });
  it("opens only one card and does not invent praise for an empty correction", () => {
    render(
      <MessageList
        {...defaults}
        messages={[
          ...messages,
          { id: 3, role: "user", content: "Merci." },
          { id: 4, role: "assistant", content: "Avec plaisir !" },
        ]}
      />,
    );
    expect(screen.queryByText(/表达很好/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /查看解释和其他表达/ }));
    fireEvent.click(screen.getByRole("button", { name: /表达选项/ }));
    expect(screen.getAllByRole("complementary")).toHaveLength(1);
    expect(screen.queryByText("café 是阳性名词。")).toBeNull();
    expect(screen.getByText(/本轮没有提供纠错反馈/)).toBeVisible();
  });
  it("suppresses all per-turn learning in continuous conversation", () => {
    render(<MessageList {...defaults} hideCorrections />);
    expect(
      screen.queryByRole("button", { name: /查看解释和其他表达/ }),
    ).toBeNull();
  });
  it("generates separate alternatives only on demand and caches them across closing", async () => {
    const rewrite = vi.fn(async (_text: string, style: "polite" | "slang") => ({
      expression:
        style === "polite"
          ? "Je souhaiterais un café, s’il vous plaît."
          : "Un café, s’il te plaît.",
      explanation:
        style === "polite" ? "使用条件式表达礼貌请求。" : "简短的日常表达。",
    }));
    render(<MessageList {...defaults} onRewrite={rewrite} />);
    expect(rewrite).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /查看解释和其他表达/ }));
    expect(screen.getByRole("tab", { name: "纠正错误" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(screen.getByRole("tab", { name: "更礼貌" }));
    await screen.findByText("Je souhaiterais un café, s’il vous plaît.");
    fireEvent.click(screen.getByRole("tab", { name: "俚语" }));
    await screen.findByText("Un café, s’il te plaît.");
    fireEvent.click(screen.getByRole("button", { name: "收起学习卡" }));
    fireEvent.click(screen.getByRole("button", { name: /查看解释和其他表达/ }));
    fireEvent.click(screen.getByRole("tab", { name: "更礼貌" }));
    await screen.findByText("Je souhaiterais un café, s’il vous plaît.");
    expect(rewrite).toHaveBeenCalledTimes(2);
  });
  it("uses the new interface language and ignores late results from another tab", async () => {
    let resolvePolite!: (value: {
      expression: string;
      explanation: string;
    }) => void;
    const rewrite = vi.fn(
      (_text: string, style: "polite" | "slang", language: "en" | "zh") =>
        style === "polite" && language === "zh"
          ? new Promise<{ expression: string; explanation: string }>(
              (resolve) => {
                resolvePolite = resolve;
              },
            )
          : Promise.resolve({
              expression: "Un café, s’il te plaît.",
              explanation:
                language === "en" ? "A casual request." : "日常请求。",
            }),
    );
    const { rerender } = render(
      <MessageList {...defaults} onRewrite={rewrite} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /查看解释和其他表达/ }));
    fireEvent.click(screen.getByRole("tab", { name: "更礼貌" }));
    fireEvent.click(screen.getByRole("tab", { name: "俚语" }));
    await screen.findByText("日常请求。");
    resolvePolite({ expression: "Bonjour", explanation: "旧结果" });
    await waitFor(() => expect(screen.queryByText("旧结果")).toBeNull());
    rerender(<MessageList {...defaults} language="en" onRewrite={rewrite} />);
    fireEvent.click(screen.getByRole("tab", { name: "Slang" }));
    await screen.findByText("A casual request.");
    expect(rewrite).toHaveBeenLastCalledWith(
      "Je voudrais un café.",
      "slang",
      "en",
    );
  });
  it("retries failed rewrites without leaving a stuck loading state", async () => {
    const rewrite = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue({
        expression: "Un café, s’il vous plaît.",
        explanation: "A polite request.",
      });
    render(<MessageList {...defaults} onRewrite={rewrite} />);
    fireEvent.click(screen.getByRole("button", { name: /查看解释和其他表达/ }));
    fireEvent.click(screen.getByRole("tab", { name: "更礼貌" }));
    fireEvent.click(await screen.findByRole("button", { name: /生成失败/ }));
    await screen.findByText("Un café, s’il vous plaît.");
    expect(rewrite).toHaveBeenCalledTimes(2);
  });
  it("preserves on-demand translations", async () => {
    const translate = vi.fn(async () => "还需要什么？");
    render(<MessageList {...defaults} onTranslate={translate} />);
    expect(translate).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "翻译" }));
    await screen.findByText("还需要什么？");
    fireEvent.click(screen.getByRole("button", { name: "收起翻译" }));
    expect(screen.queryByText("还需要什么？")).toBeNull();
  });
});

it("translates an existing explanation on opening after the interface language changes", async () => {
  const translate = vi.fn(async () => "Café is a masculine noun.");
  render(<MessageList {...defaults} language="en" onTranslate={translate} />);
  expect(translate).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: /View explanation and alternatives/ }),
  );
  await screen.findByText("Café is a masculine noun.");
  expect(translate).toHaveBeenCalledExactlyOnceWith("café 是阳性名词。", "en");
  fireEvent.keyDown(screen.getByRole("tab", { name: "Correct errors" }), {
    key: "ArrowRight",
  });
  expect(screen.getByRole("tab", { name: "More polite" })).toHaveFocus();
  expect(screen.getByRole("tab", { name: "More polite" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});

it("offers slang distinctly from correction and politeness, using the corrected sentence", async () => {
  const rewrite = vi.fn(async () => ({
    expression: "Je voudrais un café.",
    explanation: "No suitable slang substitution here.",
  }));
  render(
    <MessageList
      {...defaults}
      language="en"
      onRewrite={rewrite}
      onTranslate={async () => "Café is masculine."}
    />,
  );
  fireEvent.click(
    screen.getByRole("button", { name: /View explanation and alternatives/ }),
  );
  expect(screen.queryByRole("tab", { name: "More natural" })).toBeNull();
  expect(rewrite).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("tab", { name: "Slang" }));
  await screen.findByText("No suitable slang substitution here.");
  expect(rewrite).toHaveBeenCalledExactlyOnceWith(
    "Je voudrais un café.",
    "slang",
    "en",
  );
});
