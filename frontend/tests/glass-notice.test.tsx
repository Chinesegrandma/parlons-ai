import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { GlassNotice } from "../components/GlassNotice";

it("dismisses only the speech notice and preserves the surrounding text interface", async () => {
  render(
    <>
      <GlassNotice language="en">
        Speech unavailable. Text is available.
      </GlassNotice>
      <textarea aria-label="Message" />
      <button>Send</button>
    </>,
  );
  expect(screen.getByRole("status")).toHaveTextContent("Speech unavailable");
  await userEvent.click(
    screen.getByRole("button", { name: "Dismiss speech notice" }),
  );
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  await userEvent.type(screen.getByRole("textbox"), "Bonjour");
  expect(screen.getByRole("textbox")).toHaveValue("Bonjour");
  expect(screen.getByRole("button", { name: "Send" })).toBeEnabled();
});
