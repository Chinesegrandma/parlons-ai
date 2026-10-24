import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { Studio } from "../components/Studio";
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
async function openPractice() {
  const user = userEvent.setup();
  render(<Studio demo />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "开始练习" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "开始练习" }));
  await screen.findByRole("heading", { name: /Bonjour et bienvenue/ });
  return user;
}
it("runs a scenario, reveals feedback, and summarizes actual practice without network calls", async () => {
  const user = await openPractice();
  await user.click(screen.getByRole("button", { name: "键盘输入" }));
  await user.type(
    screen.getByRole("textbox", { name: "输入内容" }),
    "Je voudrais une café.",
  );
  await user.click(screen.getByRole("button", { name: "发送" }));
  await screen.findByRole("heading", { name: /Avec plaisir/ });
  const note = screen.getByRole("complementary", { name: "本轮纠错" });
  expect(within(note).getByText(/示例反馈：café 是阳性名词/)).toBeVisible();
  await user.click(within(note).getByRole("button", { name: "收进笔记本" }));
  expect(
    within(note).getByRole("button", { name: "已收进笔记本" }),
  ).toBeDisabled();
  await user.click(screen.getByRole("button", { name: "结束练习" }));
  expect(screen.getByText("Je voudrais une café.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "返回首页" }));
  await user.click(screen.getByRole("button", { name: /继续上次对话/ }));
  expect(screen.getByRole("heading", { name: /Avec plaisir/ })).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
});
it("fills a starter without sending and keeps transcript collapsed", async () => {
  const user = await openPractice();
  await user.click(screen.getByText("练习工具"));
  await user.click(screen.getByText("找点灵感"));
  await user.click(
    screen.getByRole("button", {
      name: "Je voudrais un café, s’il vous plaît.",
    }),
  );
  expect(screen.getByRole("textbox", { name: "输入内容" })).toHaveValue(
    "Je voudrais un café, s’il vous plaît.",
  );
  expect(
    screen.getByLabelText("对话记录").closest("details"),
  ).not.toHaveAttribute("open");
  expect(fetch).not.toHaveBeenCalled();
});
it("demonstrates recording and transcript review without requesting microphone permission", async () => {
  const microphone = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: microphone },
  });
  const user = await openPractice();
  await user.click(screen.getByRole("button", { name: "开始录音" }));
  expect(screen.getByText(/模拟录音/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "结束录音" }));
  expect(screen.getByRole("textbox", { name: "编辑转写" })).toHaveValue(
    "Je voudrais une café, s’il vous plaît.",
  );
  expect(microphone).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
it("keeps all eight scenes available and offers real playback settings", async () => {
  const user = userEvent.setup();
  render(<Studio demo />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "开始练习" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "更多场景" }));
  await user.click(screen.getByRole("button", { name: "餐厅晚餐" }));
  expect(screen.getByRole("button", { name: "餐厅晚餐" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await user.click(screen.getByRole("button", { name: "开始练习" }));
  await screen.findByRole("heading", {
    name: /Bonsoir\s! Avez-vous une réservation\s\?/,
  });
  await user.click(screen.getByRole("button", { name: "设置" }));
  await user.click(screen.getByText("播放与连接"));
  expect(screen.getByRole("checkbox", { name: "自动朗读" })).toBeChecked();
  await user.click(
    screen.getByRole("checkbox", { name: "慢速播放（0.8 倍）" }),
  );
  expect(localStorage.getItem("parlons-slow")).toBe("true");
});
