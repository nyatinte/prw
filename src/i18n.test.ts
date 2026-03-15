import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("os-locale", () => ({
  default: vi.fn(() => "en-US"),
}));

import osLocale from "os-locale";
import { getLocale } from "#paraglide/runtime.js";
import { initializeLocale } from "./i18n.js";

describe(initializeLocale, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["ja-JP", "ja"],
    ["ja", "ja"],
    ["en-US", "en"],
    ["en", "en"],
  ])("resolves %s to %s", (input, expected) => {
    vi.mocked(osLocale).mockReturnValue(input);
    initializeLocale();
    expect(getLocale()).toBe(expected);
  });

  it("falls back to baseLocale for unsupported locale", () => {
    vi.mocked(osLocale).mockReturnValue("zh-CN");
    initializeLocale();
    expect(getLocale()).toBe("en");
  });

  it.each([
    "C",
    "POSIX",
  ])("falls back to baseLocale for non-BCP47 locale %s", (input) => {
    vi.mocked(osLocale).mockReturnValue(input);
    initializeLocale();
    expect(getLocale()).toBe("en");
  });
});
