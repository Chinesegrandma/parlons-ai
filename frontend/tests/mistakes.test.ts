import { expect, it } from "vitest";
import { collectMistakes, questionsFor } from "../lib/mistakes";
import type { Review, Session } from "../lib/types";

const session: Session = {
  id: "s1",
  topic: "cafe",
  messages: [
    { id: 1, role: "user", content: "Je voudrais une café." },
    {
      id: 2,
      role: "assistant",
      content: "Bien sûr.",
      feedback_for: 1,
      correction_details: [
        { original: "une", suggestion: "un", explanation: "Masculine noun", category: "article" },
      ],
    },
  ],
};

it("stores individual mistakes once and builds a targeted quiz", () => {
  const book = collectMistakes({ cards: [], seen: [] }, session);
  expect(book.mistakes).toHaveLength(1);
  expect(collectMistakes(book, session)).toBe(book);
  const review: Review = { summary: "Review", strengths: [], corrections: session.messages[1].correction_details! };
  expect(collectMistakes(book, session, review)).toBe(book);
  const questions = questionsFor("article", book.mistakes!);
  expect(questions[0].options[questions[0].answer]).toBe("un");
  expect(questions[0].prompt).toContain("___");
  expect(questions).toHaveLength(6);
});

it("collects summary-only feedback", () => {
  const noFeedback = { ...session, messages: session.messages.slice(0, 1) };
  const book = collectMistakes({ cards: [], seen: [] }, noFeedback, {
    summary: "Review",
    strengths: [],
    corrections: session.messages[1].correction_details!,
  });
  expect(book.mistakes?.[0].category).toBe("article");
});
