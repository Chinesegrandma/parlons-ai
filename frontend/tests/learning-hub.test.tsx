import { render, screen, waitFor } from "@testing-library/react";
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
it("starts a specific work scenario with real goals and configured preferences", async () => {
  const user = userEvent.setup();
  render(<Studio demo />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "换个场景" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "设置" }));
  await user.click(screen.getByRole("button", { name: "英文" }));
  await user.click(screen.getByText("更多偏好"));
  await user.selectOptions(screen.getByLabelText("练习重点"), "grammar");
  await user.click(screen.getByRole("button", { name: "设置" }));
  await user.click(screen.getByRole("button", { name: "换个场景" }));
  await user.click(screen.getByRole("button", { name: /第一天入职/ }));
  await user.click(screen.getByRole("button", { name: "练习这个场景" }));
  await screen.findByText("第一天入职");
  await user.click(screen.getByText("练习工具"));
  await user.click(screen.getByText("本次目标"));
  expect(screen.getByRole("checkbox", { name: "介绍自己" })).not.toBeChecked();
  await user.click(screen.getByRole("checkbox", { name: "介绍自己" }));
  expect(screen.getByText(/1\/3 · 自行确认/)).toBeVisible();
  const saved = JSON.parse(
    localStorage.getItem("parlons-local-demo-data") || "[]",
  ).at(-1);
  expect(saved.options).toMatchObject({
    scene: "第一天入职",
    focus: "grammar",
    explanation_language: "English",
  });
});
it("saves expressions, reviews them, and persists notes after remount", async () => {
  const user = userEvent.setup();
  const view = render(<Studio demo />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "笔记本" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "笔记本" }));
  await user.type(
    screen.getByLabelText("收藏一句表达"),
    "Ça te dit de sortir ?",
  );
  await user.click(screen.getByRole("button", { name: "保存表达" }));
  await user.click(screen.getByRole("button", { name: "开始复习" }));
  await user.click(screen.getByRole("button", { name: "查看笔记" }));
  await user.click(screen.getByRole("button", { name: "我独立想起来了" }));
  expect(screen.getByText(/1 次独立回想/)).toBeVisible();
  view.unmount();
  render(<Studio demo />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "笔记本" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "笔记本" }));
  expect(screen.getByText("Ça te dit de sortir ?")).toBeVisible();
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

it("defers corrections until the end when the learner chooses uninterrupted practice", async () => {
  const user = userEvent.setup();
  render(<Studio demo />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "开始练习" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "设置" }));
  await user.selectOptions(screen.getByLabelText("纠错时机"), "after_session");
  await user.click(screen.getByRole("button", { name: "设置" }));
  await user.click(screen.getByRole("button", { name: "开始练习" }));
  await user.click(screen.getByRole("button", { name: "键盘输入" }));
  await user.type(
    screen.getByRole("textbox", { name: "输入内容" }),
    "Je voudrais une café.",
  );
  await user.click(screen.getByRole("button", { name: "发送" }));
  await screen.findByRole("heading", { name: /Avec plaisir/ });
  expect(screen.queryByText(/示例反馈：café/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "结束练习" }));
  expect(screen.getByText(/示例反馈：café/)).toBeVisible();
});
