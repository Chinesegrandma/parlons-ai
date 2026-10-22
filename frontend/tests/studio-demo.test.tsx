import { render, screen, waitFor } from "@testing-library/react";
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

it("runs an interactive local scenario and shows scripted feedback without network calls", async () => {
  const user = userEvent.setup();
  render(<Studio demo />);
  await screen.findByText("离线交互演示");
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "巴黎咖啡馆" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "巴黎咖啡馆" }));
  await screen.findByText(
    "Bonjour et bienvenue ! Qu’est-ce que je vous sers aujourd’hui ?",
  );
  await user.type(
    screen.getByRole("textbox", { name: "Message" }),
    "Je voudrais une café.",
  );
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText(
    "Avec plaisir ! Vous préférez un espresso ou un café allongé ? Et avec ça, un croissant ?",
  );
  expect(screen.getAllByText(/示例反馈：café 是阳性名词/)).toHaveLength(2);
  expect(fetch).not.toHaveBeenCalled();
});

it("fills starter phrases without sending them", async () => {
  const user = userEvent.setup();
  render(<Studio demo />);
  await screen.findByText("Salut ! Comment s’est passée ta journée ?");
  await user.click(
    screen.getByRole("button", { name: "Aujourd’hui, j’ai envie de…" }),
  );
  expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
    "Aujourd’hui, j’ai envie de…",
  );
  expect(screen.getAllByRole("article")).toHaveLength(1);
  expect(fetch).not.toHaveBeenCalled();
});

it("demonstrates recording and transcript review without requesting microphone permission", async () => {
  const microphone = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: microphone },
  });
  const user = userEvent.setup();
  render(<Studio demo />);
  await screen.findByText("Speech available");
  await user.click(screen.getByRole("button", { name: "Record French" }));
  expect(screen.getByText(/不会开启麦克风/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Stop recording" }));
  expect(screen.getByRole("textbox", { name: "Edit transcript" })).toHaveValue(
    "Je voudrais une café, s’il vous plaît.",
  );
  expect(microphone).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});

it("opens a useful guide and keeps the selected scenario accessible", async () => {
  const user = userEvent.setup();
  render(<Studio demo />);
  await screen.findByText("离线交互演示");
  await user.click(screen.getByRole("button", { name: /使用指南/ }));
  expect(screen.getByRole("region", { name: "使用指南" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: /使用指南/ }));
  expect(
    screen.queryByRole("region", { name: "使用指南" }),
  ).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "日常生活" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});
