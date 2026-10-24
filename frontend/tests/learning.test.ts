import { expect, it } from "vitest";
import { collectMemories, reviewMemory } from "../lib/learning";
import type { Session } from "../lib/types";
const session: Session = {
  id: "s1",
  topic: "cafe",
  messages: [
    {
      id: 1,
      role: "user",
      content: "Je voudrais une café.",
      original_transcript: "une café",
    },
    {
      id: 2,
      role: "assistant",
      content: "Bien sûr !",
      correction: "Use un café",
      corrected_text: "Je voudrais un café.",
      review_prompt: "Order a tea.",
    },
  ],
};
it("retains original and sent wording separately and creates an unconfirmed candidate", () => {
  const book = collectMemories({ cards: [], seen: [] }, session, 100);
  expect(book.cards[0]).toMatchObject({
    original: "une café",
    sent: "Je voudrais une café.",
    corrected: "Je voudrais un café.",
    accepted: false,
  });
  expect(collectMemories(book, session)).toBe(book);
  expect(collectMemories({ ...book, cards: [] }, session).cards).toHaveLength(
    0,
  );
});
it("repeated errors reset a note to due without duplicating the card", () => {
  const book = collectMemories({ cards: [], seen: [] }, session, 100);
  const repeated = collectMemories(book, { ...session, id: "s2" }, 200);
  expect(repeated.cards).toHaveLength(1);
  expect(repeated.cards[0]).toMatchObject({ occurrences: 2, due: 200 });
});
it("schedules only explicit self-checks and resets after difficulty", () => {
  const card = collectMemories({ cards: [], seen: [] }, session, 0).cards[0];
  const once = reviewMemory(card, true, 100);
  expect(once).toMatchObject({
    reviews: 1,
    due: 100 + 86400000,
    accepted: true,
  });
  expect(reviewMemory(once, true, 200).due).toBe(200 + 3 * 86400000);
  expect(reviewMemory(once, false, 300)).toMatchObject({
    reviews: 0,
    due: 300,
  });
});
