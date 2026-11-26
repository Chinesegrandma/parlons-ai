import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { PracticeHome } from "../components/PracticeHome";
it("keeps landing content and surprise settings at their intended navigation levels", async () => {
  const user = userEvent.setup();
  const start = vi.fn();
  render(<PracticeHome language="zh" onStart={start} onResume={vi.fn()} disabled={false} />);
  const surprise = "真实场景中加入随机意外";
  expect(screen.getByText("让法语，走进你的生活。")).toBeVisible();
  expect(screen.queryByLabelText(surprise)).toBeNull();
  expect(screen.queryByText("即时纠错")).toBeNull();
  await user.click(screen.getByRole("button", { name: "办事" }));
  expect(screen.queryByText("让法语，走进你的生活。")).toBeNull();
  expect(screen.queryByText("直接开始聊天")).toBeNull();
  // Life admin also contains directly startable scenarios (renting, post, support).
  expect(screen.getByLabelText(surprise)).toBeVisible();
  await user.click(screen.getByRole("button", { name: /银行.*查看具体事项/ }));
  expect(screen.getByLabelText(surprise)).not.toBeChecked();
  await user.click(screen.getByLabelText(surprise));
  await user.click(screen.getByRole("button", { name: /办理银行卡.*进入对话/ }));
  expect(start).toHaveBeenLastCalledWith("bank_card", { scenario_variant: "surprise" });
  await user.click(screen.getByRole("button", { name: "返回" }));
  expect(screen.getByLabelText(surprise)).not.toBeChecked();
  await user.click(screen.getByRole("button", { name: "返回" }));
  await user.click(screen.getByRole("button", { name: "表达挑战" }));
  expect(screen.queryByLabelText(surprise)).toBeNull();
  expect(screen.queryByText("直接开始聊天")).toBeNull();
});
