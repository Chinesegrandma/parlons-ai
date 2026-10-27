import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { expect, it, vi } from "vitest";
import { Composer } from "../components/Composer";
import type { Transcript } from "../lib/types";

it("uses the same button to record, stop, wait for transcription and send an edited draft", async () => {
  const user = userEvent.setup();
  const send = vi.fn();
  let deliver!: () => void;
  function Harness() {
    const [listening, setListening] = useState(false);
    const [transcribing, setTranscribing] = useState(false);
    const [input, setInput] = useState("");
    const [transcript, setTranscript] = useState<Transcript | null>(null);
    deliver = () => {
      setTranscribing(false);
      setInput("Je voudrais une café.");
      setTranscript({ id: "t1", original_text: "Je voudrais une café." });
    };
    return (
      <Composer
        language="en"
        input={input}
        transcript={transcript}
        listening={listening}
        transcribing={transcribing}
        disabled={transcribing}
        sttReady
        error=""
        onChange={setInput}
        onDiscard={() => {
          setInput("");
          setTranscript(null);
        }}
        onRecord={() => {
          if (listening) {
            setListening(false);
            setTranscribing(true);
          } else setListening(true);
        }}
        onSend={() => {
          send({ text: input, original: transcript?.original_text });
          setInput("");
          setTranscript(null);
        }}
      />
    );
  }
  render(<Harness />);
  const control = screen.getByRole("button", { name: "Record French" });
  await user.click(control);
  expect(screen.getByRole("button", { name: "Stop recording" })).toBe(control);
  await user.click(control);
  expect(screen.getByRole("button", { name: "Transcribing" })).toBe(control);
  expect(control).toBeDisabled();
  await user.click(control);
  expect(send).not.toHaveBeenCalled();
  act(() => deliver());
  expect(screen.getByRole("button", { name: "Send" })).toBe(control);
  expect(send).not.toHaveBeenCalled();
  await user.clear(screen.getByRole("textbox", { name: "Edit transcript" }));
  await user.type(
    screen.getByRole("textbox", { name: "Edit transcript" }),
    "Je voudrais un café.",
  );
  await user.click(control);
  expect(send).toHaveBeenCalledExactlyOnceWith({
    text: "Je voudrais un café.",
    original: "Je voudrais une café.",
  });
  expect(screen.getByRole("button", { name: "Record French" })).toBe(control);
});

it("keeps typing available when speech is unavailable and exposes only one composer action", async () => {
  const user = userEvent.setup();
  const send = vi.fn();
  function Harness() {
    const [input, setInput] = useState("");
    return (
      <Composer
        language="en"
        input={input}
        transcript={null}
        listening={false}
        disabled={false}
        sttReady={false}
        error=""
        onChange={setInput}
        onRecord={vi.fn()}
        onSend={send}
        onDiscard={vi.fn()}
      />
    );
  }
  const { container } = render(<Harness />);
  expect(screen.getByRole("button", { name: "Record French" })).toBeDisabled();
  await user.type(screen.getByRole("textbox", { name: "Message" }), "Bonjour");
  expect(container.querySelectorAll(".composer button")).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Send" }));
  expect(send).toHaveBeenCalledOnce();
});
