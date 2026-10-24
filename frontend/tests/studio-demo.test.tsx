import { render, screen, waitFor, within } from "@testing-library/react";
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
async function openPractice() {
  const user = userEvent.setup();
  render(<Studio demo />);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Start speaking" }),
    ).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "Start speaking" }));
  await screen.findByRole("heading", { name: /Bonjour et bienvenue/ });
  return user;
}
it("runs a scenario, reveals feedback, and summarizes actual practice without network calls", async () => {
  const user = await openPractice();
  await user.type(
    screen.getByRole("textbox", { name: "Message" }),
    "Je voudrais une café.",
  );
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByRole("heading", { name: /Avec plaisir/ });
  const note = screen.getByText("A LITTLE LANGUAGE NOTE").parentElement!;
  await user.click(within(note).getByText(/A more natural way/));
  expect(within(note).getByText(/示例反馈：café 是阳性名词/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Finish session" }));
  expect(screen.getByText("Je voudrais une café.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Back to home" }));
  await user.click(
    screen.getByRole("button", { name: /Continue your last conversation/ }),
  );
  expect(screen.getByRole("heading", { name: /Avec plaisir/ })).toBeVisible();
  expect(fetch).not.toHaveBeenCalled();
});
it("fills a starter without sending and keeps transcript collapsed", async () => {
  const user = await openPractice();
  await user.click(screen.getByText("Need a little inspiration?"));
  await user.click(
    screen.getByRole("button", {
      name: "Je voudrais un café, s’il vous plaît.",
    }),
  );
  expect(screen.getByRole("textbox", { name: "Message" })).toHaveValue(
    "Je voudrais un café, s’il vous plaît.",
  );
  expect(
    screen.getByLabelText("Conversation history").closest("details"),
  ).not.toHaveAttribute("open");
  expect(fetch).not.toHaveBeenCalled();
});
it("demonstrates recording and transcript review without requesting microphone permission", async () => {
  const microphone = vi.fn();
  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: { getUserMedia: microphone },
  });
  const user = await openPractice();
  await user.click(screen.getByRole("button", { name: "Record French" }));
  expect(screen.getByText(/no microphone used/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Stop recording" }));
  expect(screen.getByRole("textbox", { name: "Edit transcript" })).toHaveValue(
    "Je voudrais une café, s’il vous plaît.",
  );
  expect(microphone).not.toHaveBeenCalled();
  expect(fetch).not.toHaveBeenCalled();
});
it("keeps all eight scenes available and offers real playback settings", async () => {
  const user = userEvent.setup();
  render(<Studio demo />);
  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: "Start speaking" }),
    ).toBeEnabled(),
  );
  await user.click(screen.getByRole("button", { name: "More +" }));
  await user.click(screen.getByRole("button", { name: "Au restaurant" }));
  expect(screen.getByRole("button", { name: "Au restaurant" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await user.click(screen.getByRole("button", { name: "Start speaking" }));
  await screen.findByRole("heading", {
    name: "Bonsoir ! Avez-vous une réservation ?",
  });
  await user.click(screen.getByRole("button", { name: "Settings" }));
  expect(
    screen.getByRole("checkbox", { name: "Autoplay replies" }),
  ).toBeChecked();
  await user.click(
    screen.getByRole("checkbox", { name: "Slow playback (0.8×)" }),
  );
  expect(localStorage.getItem("parlons-slow")).toBe("true");
});
