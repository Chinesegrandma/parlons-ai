import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { PracticeGuide } from "../components/PracticeGuide";
import { ScenarioLibrary } from "../components/ScenarioLibrary";
import { Composer } from "../components/Composer";
import { practice } from "../lib/practice";
import { scenarios } from "../lib/scenarios";
import { topics } from "../lib/types";

it("all eight scenes have three usable guide tasks and expressions", () => {
  expect(topics).toHaveLength(8);
  for (const { id } of topics) {
    expect(practice[id].goals).toHaveLength(3);
    expect(scenarios[id].starters).toHaveLength(3);
    expect(scenarios[id].vocabulary.length).toBeGreaterThan(0);
  }
});

it("searches the scene library and starts the selected topic", async () => {
  const select = vi.fn();
  const user = userEvent.setup();
  render(<ScenarioLibrary onSelect={select} disabled={false} />);
  await user.click(screen.getByRole("button", { name: "探索 8 个生活场景" }));
  await user.type(
    screen.getByRole("textbox", { name: "搜索练习场景" }),
    "购物",
  );
  expect(
    screen.queryByRole("button", { name: "开始预约看诊练习" }),
  ).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "开始逛街购物练习" }));
  expect(select).toHaveBeenCalledWith("shopping");
  expect(
    screen.queryByRole("textbox", { name: "搜索练习场景" }),
  ).not.toBeInTheDocument();
});

it("never sends a hint and protects an existing draft", async () => {
  const use = vi.fn();
  const user = userEvent.setup();
  const view = render(
    <PracticeGuide
      topic="restaurant"
      disabled={false}
      hasDraft={true}
      onUse={use}
    />,
  );
  await user.click(screen.getByRole("button", { name: "提示：说明用餐人数" }));
  expect(screen.getByRole("button", { name: "填入草稿" })).toBeDisabled();
  expect(use).not.toHaveBeenCalled();
  view.rerender(
    <PracticeGuide
      topic="restaurant"
      disabled={false}
      hasDraft={false}
      onUse={use}
    />,
  );
  await user.click(screen.getByRole("button", { name: "填入草稿" }));
  expect(use).toHaveBeenCalledWith(scenarios.restaurant.starters[0]);
});

it("records reversible self-reported tasks without claiming an AI score", async () => {
  const user = userEvent.setup();
  render(
    <PracticeGuide
      topic="cafe"
      disabled={false}
      hasDraft={false}
      onUse={vi.fn()}
    />,
  );
  for (const goal of practice.cafe.goals) {
    await user.click(screen.getByRole("button", { name: `标记任务：${goal}` }));
  }
  expect(screen.getByText("3/3")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("三个小目标");
  await user.click(
    screen.getByRole("button", { name: `标记任务：${practice.cafe.goals[0]}` }),
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

it("preserves multiline drafts with Shift+Enter and sends with Enter", () => {
  const send = vi.fn();
  render(
    <Composer
      input="Bonjour"
      transcript={null}
      disabled={false}
      listening={false}
      sttReady={true}
      error=""
      onChange={vi.fn()}
      onRecord={vi.fn()}
      onSend={send}
      onDiscard={vi.fn()}
    />,
  );
  const input = screen.getByRole("textbox", { name: "Message" });
  expect(input.tagName).toBe("TEXTAREA");
  fireEvent.keyDown(input, { key: "Enter", shiftKey: true });
  expect(send).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter" });
  expect(send).toHaveBeenCalledTimes(1);
});
