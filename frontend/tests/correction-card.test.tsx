import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { changedWords, CorrectionCard } from "../components/CorrectionCard";
it("highlights the changed article without highlighting the rest of the sentence", () => {
  const words = changedWords("Je voudrais une café.", "Je voudrais un café.");
  expect(words.original.filter((w) => w.changed).map((w) => w.text)).toEqual([
    "une",
  ]);
  expect(words.corrected.filter((w) => w.changed).map((w) => w.text)).toEqual([
    "un",
  ]);
  expect(words.corrected.map((w) => w.text).join("")).toBe(
    "Je voudrais un café.",
  );
});
it("supports insertions, deletions, and unchanged wording without invented diffs", () => {
  expect(
    changedWords("Bonjour", "Bonjour").corrected.some((w) => w.changed),
  ).toBe(false);
  expect(
    changedWords("Je parle.", "Je parle français.")
      .corrected.filter((w) => w.changed)
      .map((w) => w.text),
  ).toContain("français.");
  expect(
    changedWords("Très très bien", "Très bien")
      .original.filter((w) => w.changed)
      .map((w) => w.text),
  ).toEqual(["très"]);
});
it("shows the saved state and readable correction labels", () => {
  render(
    <CorrectionCard
      original="une café"
      corrected="un café"
      explanation="café 是阳性名词。"
      saved
      onSave={vi.fn()}
    />,
  );
  expect(screen.getByText("你说的")).toBeVisible();
  expect(screen.getByText("更自然的说法")).toBeVisible();
  expect(screen.getByRole("button", { name: "已收进笔记本" })).toBeDisabled();
});
