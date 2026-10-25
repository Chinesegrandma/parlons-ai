import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { Studio } from "../components/Studio";
import { api } from "../lib/api";
beforeEach(() => {
  vi.stubGlobal(
    "Audio",
    class {
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      removeAttribute = vi.fn();
      playbackRate = 1;
    },
  );
});

it("keeps custom situations and learning preferences with the new home flow", async () => {
  const user = userEvent.setup();
  render(<Studio demo />);
  await user.click(screen.getByRole("button", { name: "设置" }));
  await user.selectOptions(
    screen.getByRole("combobox", { name: "语言" }),
    "en",
  );
  await user.selectOptions(screen.getByLabelText("Practice focus"), "grammar");
  await user.selectOptions(screen.getByLabelText("Practice level"), "C1");
  await user.click(screen.getByRole("button", { name: "Close settings" }));
  await user.click(screen.getByText("Create your own situation"));
  await user.type(
    screen.getByLabelText("What would you like to practice?"),
    "Meeting with a manager",
  );
  await user.click(
    screen.getByRole("button", { name: "Enter conversation →" }),
  );
  await screen.findByRole("heading", { name: "Your scenario" });
  const saved = JSON.parse(
    localStorage.getItem("parlons-local-demo-data") || "[]",
  ).at(-1);
  expect(saved.options).toMatchObject({
    scene: "Your scenario",
    situation: "Meeting with a manager",
    focus: "grammar",
    level: "C1",
    explanation_language: "English",
  });
});
it("preserves saved expressions and spaced review records after remount", async () => {
  const user = userEvent.setup();
  const view = render(<Studio demo />);
  await user.click(screen.getByRole("button", { name: "笔记本" }));
  await user.type(
    screen.getByRole("textbox", { name: "收藏一个表达" }),
    "Ça te dit de sortir ?",
  );
  await user.click(screen.getByRole("button", { name: "收藏" }));
  await user.click(screen.getByRole("button", { name: "待复习" }));
  await user.click(screen.getByRole("button", { name: "显示表达" }));
  await user.click(screen.getByRole("button", { name: "我记得了" }));
  const saved = JSON.parse(
    localStorage.getItem("parlons-demo-learning") || "{}",
  );
  expect(saved.book.cards[0].reviews).toBe(1);
  view.unmount();
  render(<Studio demo />);
  await user.click(screen.getByRole("button", { name: "笔记本" }));
  expect(await screen.findByText("Ça te dit de sortir ?")).toBeVisible();
});
it("API sends learning preferences and selected voices", async () => {
  const fetcher = vi.mocked(fetch);
  fetcher.mockResolvedValue({
    ok: true,
    json: async () => ({ id: "s" }),
    blob: async () => new Blob(),
  } as Response);
  const { defaults } = await import("../lib/learning");
  await api.session("s", "daily", {
    ...defaults,
    situation: "Meeting",
    focus: "grammar",
  });
  expect(JSON.parse(String(fetcher.mock.calls[0][1]?.body))).toMatchObject({
    options: { situation: "Meeting", focus: "grammar" },
  });
  await api.synthesize("Bonjour", new AbortController().signal, "warm");
  expect(JSON.parse(String(fetcher.mock.calls[1][1]?.body))).toMatchObject({
    voice: "warm",
  });
});

it("defers inline corrections in conversation mode and offers an end review", async () => {
  const user = userEvent.setup();
  render(<Studio demo />);
  await user.click(screen.getByRole("button", { name: "直接开始聊天" }));
  await screen.findByText("Salut ! Comment s’est passée ta journée ?");
  await user.click(screen.getByRole("button", { name: "连续对话" }));
  await user.type(
    screen.getByRole("textbox", { name: /^(Message|输入内容)$/ }),
    "Je voudrais une café.",
  );
  await user.click(screen.getByRole("button", { name: /^(Send|发送)$/ }));
  await screen.findByText(
    "Merci de partager ça ! Qu’est-ce que tu aimerais faire ensuite ?",
  );
  expect(
    screen.queryByRole("complementary", { name: "本轮纠错" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "结束并总结" }));
  expect(
    await screen.findByText("这是预设演示总结，不评估真实语言水平。"),
  ).toBeVisible();
});
it("keeps word-level correction cards and saving them to the notebook", async () => {
  const user = userEvent.setup();
  render(<Studio demo />);
  await user.click(screen.getByRole("button", { name: "日常" }));
  await user.click(screen.getByRole("button", { name: /咖啡馆.*进入对话/ }));
  await screen.findByRole("heading", { name: "咖啡馆" });
  await user.type(
    screen.getByRole("textbox", { name: /^(Message|输入内容)$/ }),
    "Je voudrais une café.",
  );
  await user.click(screen.getByRole("button", { name: /^(Send|发送)$/ }));
  await screen.findByRole("complementary", { name: "本轮纠错" });
  await user.click(screen.getByRole("button", { name: "收进笔记本" }));
  await user.click(screen.getByRole("button", { name: "笔记本" }));
  expect(
    await screen.findByRole("heading", { name: "Je voudrais un café." }),
  ).toBeVisible();
  expect(screen.getByText("已收藏")).toBeVisible();
});
