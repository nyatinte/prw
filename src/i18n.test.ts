import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("os-locale", () => ({
  default: vi.fn(),
}));

import osLocale from "os-locale";
import { initializeLocale, resolveSupportedLocale } from "./i18n";
import { getLocale, setLocale } from "./paraglide/runtime.js";

describe("i18n", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await setLocale("en", { reload: false });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    ["ja", "ja"],
    ["ja-JP", "ja"],
    ["ja_JP.UTF-8", "ja"],
    ["en-US", "en"],
    ["fr-FR", "en"],
    [undefined, "en"],
  ])("resolveSupportedLocale(%s) returns %s", (input, expected) => {
    expect(resolveSupportedLocale(input)).toBe(expected);
  });

  it("initializes locale from os-locale", async () => {
    vi.mocked(osLocale).mockReturnValue("ja-JP");

    await expect(initializeLocale()).resolves.toBe("ja");
    expect(getLocale()).toBe("ja");
  });

  it("falls back to Intl when os-locale throws", async () => {
    const originalDateTimeFormat = Intl.DateTimeFormat;

    vi.mocked(osLocale).mockImplementation(() => {
      throw new Error("unavailable");
    });
    vi.stubGlobal("Intl", {
      ...Intl,
      DateTimeFormat: class {
        resolvedOptions() {
          return { locale: "ja-JP" };
        }
      },
    } satisfies typeof Intl);

    await expect(initializeLocale()).resolves.toBe("ja");
    expect(getLocale()).toBe("ja");

    vi.stubGlobal("Intl", {
      ...Intl,
      DateTimeFormat: originalDateTimeFormat,
    } satisfies typeof Intl);
  });
});
