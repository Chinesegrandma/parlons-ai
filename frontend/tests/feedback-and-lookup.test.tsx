import {
  act,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { WordLookup, wordAt } from "../components/WordLookup";
import { MessageList } from "../components/MessageList";
import { ChallengeSetup } from "../components/ChallengeSetup";
import { PracticeHome } from "../components/PracticeHome";
import { challengeDefinitions } from "../lib/challenges";

const props = {
  busy: false,
  speechReady: true,
  onSpeak: vi.fn(),
  onTranslate: async () => "说明",
  messages: [
    { id: 1, role: "user" as const, content: "tu utilise quand il pluie" },
    {
      id: 2,
      role: "assistant" as const,
      content: "C’est un parapluie ?",
      corrected_text: "tu utilises quand il pleut",
      correction:
        "1. utilise → utilises：tu 对应 utilises。\n2. pluie → pleut：下雨用动词。",
      feedback_for: 1,
    },
  ],
};

it("numbers each error and offers correction-specific speech and copy before expanding", async () => {
  const copy = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: copy },
    configurable: true,
  });
  const speak = vi.fn();
  const { container } = render(<MessageList {...props} onSpeak={speak} />);
  fireEvent.click(screen.getByRole("button", { name: "朗读这条表达" }));
  expect(speak).toHaveBeenCalledExactlyOnceWith(
    "tu utilises quand il pleut",
    1,
  );
  fireEvent.click(screen.getByRole("button", { name: "复制这条表达" }));
  await waitFor(() =>
    expect(copy).toHaveBeenCalledWith("tu utilises quand il pleut"),
  );
  fireEvent.click(screen.getByRole("button", { name: /查看解释和其他表达/ }));
  const errors = container.querySelector(".error-list")!;
  expect(within(errors as HTMLElement).getAllByRole("listitem")).toHaveLength(
    2,
  );
  expect(errors).toHaveTextContent("utilise → utilises");
  expect(errors).toHaveTextContent("pluie → pleut");
  fireEvent.click(screen.getByRole("button", { name: "俚语" }));
  expect(screen.queryByText("俚语小词典")).toBeNull();
});

it("hides stale legacy feedback and rejects feedback bound to another learner message", () => {
  const legacy = props.messages.map((message) => ({
    ...message,
    feedback_for: undefined,
  }));
  const { container } = render(
    <MessageList
      {...props}
      messages={[
        ...legacy,
        { id: 3, role: "user", content: "oui exactement" },
        {
          id: 4,
          role: "assistant",
          content: "À toi !",
          corrected_text: "tu utilises quand il pleut",
          correction: "旧反馈",
        },
        { id: 5, role: "user", content: "merci" },
        {
          id: 6,
          role: "assistant",
          content: "De rien",
          corrected_text: "tu utilises quand il pleut",
          feedback_for: 1,
        },
      ]}
    />,
  );
  expect(container.querySelectorAll(".learning-capsule")).toHaveLength(1);
});

it("preserves accents, apostrophes and hyphens", () => {
  expect(wordAt("C’est l’après-midi.", 9)).toBe("l’après-midi");
  expect(wordAt("un réfrigérateur", 6)).toBe("réfrigérateur");
  expect(wordAt("un café", 2)).toBe("");
});

it("requires explicit lookup and caches by context and language", async () => {
  const lookup = vi.fn(async () => ({ meaning: "下雨", example: "Il pleut." }));
  render(
    <WordLookup language="zh" onLookup={lookup}>
      <p data-lookup-text tabIndex={0}>
        pleut aujourd’hui
      </p>
    </WordLookup>,
  );
  fireEvent.keyDown(screen.getByText("pleut aujourd’hui"), { key: "Enter" });
  expect(lookup).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "查询含义" }));
  await screen.findByText("下雨");
  expect(lookup).toHaveBeenCalledExactlyOnceWith(
    "pleut",
    "pleut aujourd’hui",
    "zh",
  );
  fireEvent.click(screen.getByRole("button", { name: "关闭查词" }));
  fireEvent.keyDown(screen.getByText("pleut aujourd’hui"), { key: "Enter" });
  expect(screen.getByText("下雨")).toBeVisible();
  expect(lookup).toHaveBeenCalledTimes(1);
});

it("supports phrase selection across highlighted text in AI, learner and correction messages", () => {
  const lookup = vi.fn();
  const { container } = render(<MessageList {...props} onLookup={lookup} />);
  for (const selector of [
    ".message.user .bubble",
    ".message.assistant .bubble",
    ".correction-preview",
  ]) {
    const element = container.querySelector(selector)!;
    const range = document.createRange();
    range.selectNodeContents(element);
    window.getSelection()!.removeAllRanges();
    window.getSelection()!.addRange(range);
    fireEvent(document, new Event("selectionchange"));
    expect(
      screen.getByRole("dialog").querySelector("strong"),
    ).toHaveTextContent(element.textContent!);
    expect(lookup).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "关闭查词" }));
    window.getSelection()!.removeAllRanges();
  }
});

it("ignores late results for a closed lookup and permits a subsequent request", async () => {
  let resolve!: (value: { meaning: string; example: string }) => void;
  const lookup = vi
    .fn()
    .mockImplementationOnce(
      () =>
        new Promise((r) => {
          resolve = r;
        }),
    )
    .mockResolvedValue({ meaning: "结果 B", example: "" });
  render(
    <WordLookup language="zh" onLookup={lookup}>
      <p data-lookup-text tabIndex={0}>
        bonjour
      </p>
      <p data-lookup-text tabIndex={0}>
        salut
      </p>
    </WordLookup>,
  );
  fireEvent.keyDown(screen.getByText("bonjour"), { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: "查询含义" }));
  fireEvent.click(screen.getByRole("button", { name: "关闭查词" }));
  fireEvent.keyDown(screen.getByText("salut"), { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: "查询含义" }));
  await screen.findByText("结果 B");
  await act(async () => resolve({ meaning: "旧结果 A", example: "" }));
  expect(screen.queryByText("旧结果 A")).toBeNull();
});

it("retries lookup failures in the selected interface language", async () => {
  const lookup = vi
    .fn()
    .mockRejectedValueOnce(Error("offline"))
    .mockResolvedValue({ meaning: "A greeting.", example: "Bonjour !" });
  render(
    <WordLookup language="en" onLookup={lookup}>
      <p data-lookup-text tabIndex={0}>
        bonjour
      </p>
    </WordLookup>,
  );
  fireEvent.keyDown(screen.getByText("bonjour"), { key: "Enter" });
  fireEvent.click(screen.getByRole("button", { name: "Look up meaning" }));
  await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button", { name: "Look up meaning" }));
  await screen.findByText("A greeting.");
  expect(lookup).toHaveBeenLastCalledWith("bonjour", "bonjour", "en");
});

it("expands the word library, filters categories and saves/deletes custom targets locally", async () => {
  expect(challengeDefinitions.describe.seeds.length).toBeGreaterThanOrEqual(60);
  const start = vi.fn();
  const user = userEvent.setup();
  const view = render(
    <ChallengeSetup
      topic="challenge_describe"
      language="en"
      disabled={false}
      onBack={vi.fn()}
      onStart={start}
    />,
  );
  await user.selectOptions(screen.getByLabelText("Word category"), "nature");
  expect(
    screen.getByLabelText("Choose a target word").querySelectorAll("option")
      .length,
  ).toBeGreaterThan(5);
  expect(screen.getByLabelText("Choose a target word")).not.toHaveTextContent(
    "Toothbrush",
  );
  await user.selectOptions(screen.getByLabelText("Word source"), "custom");
  expect(
    screen.getByRole("button", { name: /Start challenge/ }),
  ).toBeDisabled();
  await user.type(
    screen.getByLabelText("Your French target word or phrase"),
    "un accordéon",
  );
  await user.click(screen.getByRole("button", { name: "Save to my words" }));
  expect(JSON.parse(localStorage.getItem("parlons-guessing-words")!)).toEqual([
    "un accordéon",
  ]);
  await user.click(screen.getByRole("button", { name: /Start challenge/ }));
  expect(start.mock.calls[0][1].challenge.custom_target).toBe("un accordéon");
  view.unmount();
  render(
    <ChallengeSetup
      topic="challenge_describe"
      language="en"
      disabled={false}
      onBack={vi.fn()}
      onStart={start}
    />,
  );
  await user.selectOptions(screen.getByLabelText("Word source"), "custom");
  await user.click(screen.getByRole("button", { name: "un accordéon" }));
  expect(
    screen.getByLabelText("Your French target word or phrase"),
  ).toHaveValue("un accordéon");
  await user.click(screen.getByRole("button", { name: "Remove un accordéon" }));
  expect(JSON.parse(localStorage.getItem("parlons-guessing-words")!)).toEqual(
    [],
  );
});

it("puts expression challenges last", () => {
  const { container } = render(
    <PracticeHome
      language="en"
      disabled={false}
      onStart={vi.fn()}
      onResume={vi.fn()}
    />,
  );
  const buttons = container.querySelectorAll(".category-card");
  expect(buttons[buttons.length - 1]).toHaveTextContent(
    "Expression challenges",
  );
});
