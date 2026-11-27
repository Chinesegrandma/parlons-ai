import { assistantOpening } from "../lib/persona";
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
  await screen.findByText(
    assistantOpening("Bonjour ! Qu’est-ce que je vous sers ?"),
  );
  await user.type(
    screen.getByRole("textbox", { name: /^(Message|输入内容)$/ }),
    "Je voudrais une café.",
  );
  await user.click(screen.getByRole("button", { name: /^(Send|发送)$/ }));
  await user.click(
    await screen.findByRole("button", { name: /查看解释和其他表达/ }),
  );
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
    screen.getByRole("button", { name: "Free chat" }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Free chat" }));
  await screen.findByText(
    assistantOpening("Salut ! Comment s’est passée ta journée ?"),
  );
  const modeSettings = screen.getByRole("button", { name: "Practice mode settings" });
  expect(modeSettings).toHaveTextContent("Learning mode");
  expect(modeSettings).toHaveAttribute("aria-expanded", "false");
  await user.click(modeSettings);
  expect(screen.getByRole("button", { name: /Learning mode/ })).toHaveAttribute("aria-pressed", "true");
  await user.click(screen.getByRole("button", { name: /Immersion mode/ }));
  expect(modeSettings).toHaveTextContent("Immersion mode");
  expect(modeSettings).toHaveAttribute("aria-expanded", "false");
  expect(
    screen.getByRole("heading", { name: "Free chat" }),
  ).toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});

it("demonstrates interest in the interview before returning to scheduling in the social fixture", async () => {
  const { demoApi } = await import("../lib/demo");
  const id = crypto.randomUUID();
  await demoApi.session(id, "invite");
  const first = await demoApi.chat(
    id,
    "En semaine, je prépare un entretien, donc plutôt samedi.",
  );
  expect(first.reply).toBe(
    "Ah, tu prépares un entretien ! C’est pour quel type de poste ?",
  );
  const second = await demoApi.chat(id, "Un poste d’ingénieur.");
  expect(second.reply).toBe(
    "J’espère que ça se passera bien ! On garde samedi après-midi pour se voir ?",
  );
  expect(fetch).not.toHaveBeenCalled();
});

it("keeps the draft and remembers Noé for the next visit", async () => {
  const user = userEvent.setup();
  const page = render(<Studio demo />);
  await user.click(screen.getByRole("button", { name: "日常" }));
  await user.click(screen.getByRole("button", { name: /咖啡馆.*进入对话/ }));
  await screen.findByText(assistantOpening("Bonjour ! Qu’est-ce que je vous sers ?"));
  const draft = screen.getByRole("textbox", { name: /^(Message|输入内容)$/ });
  await user.type(draft, "Bonjour");
  await user.click(screen.getByLabelText("Camille 与聊天设置"));
  await user.click(screen.getByRole("button", { name: /Noé.*轻松/ }));
  expect(draft).toHaveValue("Bonjour");
  expect(screen.getByText(/Camille ·/)).toBeInTheDocument();
  page.unmount();
  render(<Studio demo />);
  await user.click(screen.getByRole("button", { name: "日常" }));
  await user.click(screen.getByRole("button", { name: /咖啡馆.*进入对话/ }));
  await screen.findByLabelText("Noé 与聊天设置");
  expect(screen.getByText(/Noé ·/)).toBeInTheDocument();
});
