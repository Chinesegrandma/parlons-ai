import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach, vi } from "vitest";

beforeEach(() => {
  localStorage.clear();
  document.cookie = "parlons_language=; Path=/; Max-Age=0; Secure";
  document.cookie = "parlons_language=; Path=/; Max-Age=0";
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.reject(new Error("Unmocked network request blocked"))),
  );
  URL.createObjectURL = vi.fn(() => "blob:mock-audio");
  URL.revokeObjectURL = vi.fn();
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
