import osLocale from "os-locale";
import { m as paraglideMessages } from "./paraglide/messages.js";
import { setLocale } from "./paraglide/runtime.js";

type SupportedLocale = "en" | "ja";

const DEFAULT_LOCALE: SupportedLocale = "en";
const LOCALE_SEPARATOR_PATTERN = /_/g;
const LOCALE_SUFFIX_PATTERN = /[.:].*$/;

export const m = paraglideMessages;

export function resolveSupportedLocale(
  input: string | undefined
): SupportedLocale {
  if (!input) {
    return DEFAULT_LOCALE;
  }

  const normalized = input
    .trim()
    .replace(LOCALE_SEPARATOR_PATTERN, "-")
    .replace(LOCALE_SUFFIX_PATTERN, "")
    .toLowerCase();

  return normalized.startsWith("ja") ? "ja" : DEFAULT_LOCALE;
}

export async function initializeLocale(): Promise<SupportedLocale> {
  const locale = resolveSupportedLocale(detectLocale());
  await setLocale(locale, { reload: false });
  return locale;
}

function detectLocale(): string | undefined {
  try {
    return osLocale();
  } catch {
    return new Intl.DateTimeFormat().resolvedOptions().locale;
  }
}
