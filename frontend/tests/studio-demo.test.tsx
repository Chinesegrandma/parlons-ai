import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, it, vi } from "vitest";
import { Studio } from "../components/Studio";
beforeEach(() =>
  vi.stubGlobal(
    "Audio",
    class {
      play = vi.fn().mockResolvedValue(undefined);
      pause = vi.fn();
      removeAttribute = vi.fn();
      src = "";
      volume = 1;
      playbackRate = 1;
    },
  ),
);
it("runs a categorized offline practice and review without network access", async () => {
  const user = userEvent.setup();
  render(<Studio demo />);
  await user.click(screen.getByRole("button", { name: "日常" }));
  await user.click(screen.getByRole("button", { name: /咖啡馆.*进入对话/ }));
  await screen.findByText("Bonjour ! Qu’est-ce que je vous sers ?");
  await user.type(
    screen.getByRole("textbox", { name: "Message" }),
    "Je voudrais une café.",
  );
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText(/示例反馈：café 是阳性名词/);
  await user.click(screen.getByRole("button", { name: "结束并总结" }));
  await screen.findByText("这是预设演示总结，不评估真实语言水平。");
  expect(fetch).not.toHaveBeenCalled();
});
it("switches the entire demo interface to English and keeps French practice content", async () => {
  const user = userEvent.setup();
  render(<Studio demo />);
  await user.click(screen.getByRole("button", { name: "设置" }));
  await user.selectOptions(
    screen.getByRole("combobox", { name: "语言" }),
    "en",
  );
  expect(
    screen.getByRole("button", { name: "Start chatting" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Start chatting" }));
  await screen.findByText("Salut ! Comment s’est passée ta journée ?");
  expect(
    screen.getByRole("button", { name: "Guided practice" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("heading", { name: "Free chat" }),
  ).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
