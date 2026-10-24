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
    expect(screen.getByRole("button", { name: "Scenes" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "Settings" }));
  await user.selectOptions(screen.getByLabelText("Explain in"), "English");
  await user.selectOptions(screen.getByLabelText("Your focus"), "grammar");
  await user.click(screen.getByRole("button", { name: "Settings" }));
  await user.click(screen.getByRole("button", { name: "Scenes" }));
  await user.click(screen.getByRole("button", { name: /Your first day/ }));
  await user.click(screen.getByRole("button", { name: "Practice this scene" }));
  await screen.findByText("Your first day");
  await user.click(screen.getByText("Your mission"));
  expect(
    screen.getByRole("checkbox", { name: "Introduce yourself" }),
  ).not.toBeChecked();
  await user.click(
    screen.getByRole("checkbox", { name: "Introduce yourself" }),
  );
  expect(screen.getByText(/1\/3 · self-check/)).toBeVisible();
  const saved = JSON.parse(
    localStorage.getItem("parlons-local-demo-data") || "[]",
  ).at(-1);
  expect(saved.options).toMatchObject({
    scene: "Your first day",
    focus: "grammar",
    explanation_language: "English",
  });
});
it("saves expressions, reviews them, and persists notes after remount", async () => {
  const user = userEvent.setup();
  const view = render(<Studio demo />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Notebook" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "Notebook" }));
  await user.type(
    screen.getByLabelText("An expression you want to keep"),
    "Ça te dit de sortir ?",
  );
  await user.click(screen.getByRole("button", { name: "Save expression" }));
  await user.click(screen.getByRole("button", { name: "Review" }));
  await user.click(screen.getByRole("button", { name: "Reveal my note" }));
  await user.click(
    screen.getByRole("button", { name: "I recalled it independently" }),
  );
  expect(screen.getByText(/1 independent self-check/)).toBeVisible();
  view.unmount();
  render(<Studio demo />);
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Notebook" })).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "Notebook" }));
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
    expect(
      screen.getByRole("button", { name: "Start speaking" }),
    ).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "Settings" }));
  await user.selectOptions(
    screen.getByLabelText("Feedback timing"),
    "after_session",
  );
  await user.click(screen.getByRole("button", { name: "Settings" }));
  await user.click(screen.getByRole("button", { name: "Start speaking" }));
  await user.type(
    screen.getByRole("textbox", { name: "Message" }),
    "Je voudrais une café.",
  );
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByRole("heading", { name: /Avec plaisir/ });
  expect(screen.queryByText(/示例反馈：café/)).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Finish session" }));
  expect(screen.getByText(/示例反馈：café/)).toBeVisible();
});
