import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it, vi } from "vitest";
import { PracticeHome } from "../components/PracticeHome";
import { ChallengePanel } from "../components/ChallengePanel";
import { demoApi } from "../lib/demo";
import { defaults } from "../lib/learning";
import type { Session } from "../lib/types";

it("opens four challenge choices and starts only after explicit setup", async () => {
  const start = vi.fn();
  const user = userEvent.setup();
  render(
    <PracticeHome
      language="en"
      onStart={start}
      onResume={vi.fn()}
      disabled={false}
    />,
  );
  await user.click(
    screen.getByRole("button", { name: "Expression challenges" }),
  );
  for (const name of [
    "One-minute opinion",
    "Describe & guess",
    "Story relay",
    "Discussion & debate",
  ])
    expect(
      screen.getByRole("button", { name: new RegExp(name) }),
    ).toBeVisible();
  expect(start).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: /Discussion & debate/ }));
  await user.selectOptions(screen.getByLabelText("Choose a prompt"), "1");
  await user.selectOptions(screen.getByLabelText("Your side"), "against");
  await user.selectOptions(screen.getByLabelText("Challenge difficulty"), "C1");
  await user.click(screen.getByRole("button", { name: /Start challenge/ }));
  expect(start).toHaveBeenCalledExactlyOnceWith("challenge_debate", {
    level: "C1",
    challenge: { seed: 1, side: "against", timer_seconds: 0 },
  });
});

it("runs a pausable timer without sending or forcing the next round", () => {
  vi.useFakeTimers();
  const next = vi.fn();
  const session: Session = {
    id: "timer",
    topic: "challenge_opinion",
    messages: [],
    options: {
      ...defaults,
      challenge: { seed: 0, side: "for", timer_seconds: 60 },
    },
  };
  const view = render(
    <ChallengePanel
      session={session}
      language="en"
      disabled={false}
      onNext={next}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByLabelText("Time remaining")).toHaveTextContent("0:50");
  fireEvent.click(screen.getByRole("button", { name: "Pause timer" }));
  act(() => vi.advanceTimersByTime(10000));
  expect(screen.getByLabelText("Time remaining")).toHaveTextContent("0:50");
  fireEvent.click(screen.getByRole("button", { name: "Start timer" }));
  act(() => vi.advanceTimersByTime(50000));
  expect(screen.getByText(/Time is up/)).toHaveTextContent(
    "timer does not send",
  );
  expect(next).not.toHaveBeenCalled();
  view.unmount();
  vi.useRealTimers();
});

it("persists challenge choices and varies openings without paid calls in the demo", async () => {
  const id = crypto.randomUUID();
  const options = {
    challenge: { seed: 2, side: "against" as const, timer_seconds: 0 as const },
  };
  const session = await demoApi.session(id, "challenge_debate", {
    ...defaults,
    ...options,
  });
  expect(session.messages[0].content).toContain("moins de devoirs");
  expect(session.messages[0].content).toContain("Tu es contre");
  expect((await demoApi.history(id)).options?.challenge).toEqual(
    options.challenge,
  );
  expect(fetch).not.toHaveBeenCalled();
});

it("protects an unfinished challenge draft before starting the next round", async () => {
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
  );
  const { Studio } = await import("../components/Studio");
  const user = userEvent.setup();
  render(<Studio demo />);
  await user.click(screen.getByRole("button", { name: "表达挑战" }));
  await user.click(screen.getByRole("button", { name: /故事接龙/ }));
  await user.click(screen.getByRole("button", { name: /开始挑战/ }));
  const next = await screen.findByRole("button", { name: "换一题 · 新对话" });
  const input = screen.getByRole("textbox", { name: "输入内容" });
  await user.type(input, "Je trouve une lettre.");
  expect(next).toBeDisabled();
  await user.clear(input);
  expect(next).toBeEnabled();
  await user.click(next);
  await screen.findByText(/le chat de ton voisin te demande un service/, {
    selector: ".bubble",
  });
  expect(fetch).not.toHaveBeenCalled();
});
