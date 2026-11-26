import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { PracticeHome } from "../components/PracticeHome";
it("keeps landing content and surprise settings at their intended navigation levels", async () => {
  const user = userEvent.setup();
  const start = vi.fn();
  render(<PracticeHome language="zh" onStart={start} onResume={vi.fn()} disabled={false} />);
  const surprise = "真实场景中加入随机意外";
  expect(screen.getByRole("heading", { name: "On parle ?" })).toBeVisible();
  expect(screen.getByText("从学会法语，到用法语生活。")).toBeVisible();
  expect(screen.queryByText("UN PEU, CHAQUE JOUR")).toBeNull();
  expect(screen.queryByLabelText(surprise)).toBeNull();
  expect(screen.getByRole("button", { name: "自由聊天" })).toHaveTextContent("想聊什么，就聊什么。");
  await user.click(screen.getByRole("button", { name: "自由聊天" }));
  expect(start).toHaveBeenLastCalledWith("daily");
  expect(screen.queryByText("即时纠错")).toBeNull();
  await user.click(screen.getByRole("button", { name: "办事" }));
  expect(screen.queryByText("从学会法语，到用法语生活。")).toBeNull();
  expect(screen.queryByRole("button", { name: "自由聊天" })).toBeNull();
  // Life admin also contains directly startable scenarios (renting, post, support).
  expect(screen.queryByLabelText(surprise)).toBeNull();
  await user.click(screen.getByRole("button", {name:/住房.*查看具体事项/}));
  expect(screen.getByRole("button", {name:"联系房东"})).toBeVisible();
  await user.click(screen.getByRole("button", {name:"返回"}));
  await user.click(screen.getByRole("button", { name: /银行.*查看具体事项/ }));
  expect(screen.queryByLabelText(surprise)).toBeNull();
  await user.click(screen.getByRole("button", { name: /办理银行卡.*进入对话/ }));
  expect(start).toHaveBeenLastCalledWith("bank_card");
  await user.click(screen.getByRole("button", { name: "返回" }));
  expect(screen.queryByLabelText(surprise)).toBeNull();
  await user.click(screen.getByRole("button", { name: "返回" }));
  await user.click(screen.getByRole("button", { name: "表达挑战" }));
  expect(screen.queryByLabelText(surprise)).toBeNull();
  expect(screen.queryByRole("button", { name: "自由聊天" })).toBeNull();
});

import { practiceGroups, groupContent } from "../lib/practice-navigation";
import { catalog } from "../lib/catalog";
import { sceneVariants } from "../lib/scene-variants";
it("assigns every ordinary scenario and variant exactly once to a nonempty subgroup",()=>{
  const topics=practiceGroups.flatMap(g=>groupContent(g).scenes.map(s=>s.id));
  expect(topics.sort()).toEqual(catalog.filter(s=>s.id!=="daily" && s.id!=="interview" && s.category!=="challenge").map(s=>s.id).sort());
  const variants=practiceGroups.flatMap(g=>groupContent(g).variants.map(v=>v.zh));
  expect(variants.sort()).toEqual(sceneVariants.map(v=>v.zh).sort());
  for(const g of practiceGroups) expect(g.topics.length+g.variants.length).toBeGreaterThan(0);
});
it("separates school and work before showing their individual situations",async()=>{
  const user=userEvent.setup(); const start=vi.fn();
  render(<PracticeHome language="zh" onStart={start} onResume={vi.fn()} disabled={false}/>);
  await user.click(screen.getByRole("button",{name:"学业与工作"}));
  expect(screen.getByRole("button",{name:/学校.*查看具体事项/})).toBeVisible();
  await user.click(screen.getByRole("button",{name:/工作.*查看具体事项/}));
  expect(screen.getByRole("button",{name:"同事闲聊"})).toBeVisible();
  expect(screen.queryByRole("button",{name:/选课.*进入对话/})).toBeNull();
  await user.click(screen.getByRole("button",{name:"同事闲聊"}));
  expect(start).toHaveBeenLastCalledWith("report",expect.objectContaining({scene:"同事闲聊"}));
});

it("starts interview directly from its dedicated home card",async()=>{
  const user=userEvent.setup(); const start=vi.fn();
  render(<PracticeHome language="zh" onStart={start} onResume={vi.fn()} disabled={false}/>);
  await user.click(screen.getByRole("button",{name:"面试"}));
  expect(start).toHaveBeenLastCalledWith("interview");
  expect(screen.queryByText("技术面试")).toBeNull();
  expect(screen.queryByText("录用与薪资")).toBeNull();
});
