import osLocale from "os-locale";
import * as messages from "./paraglide/messages.js";
import { setLocale } from "./paraglide/runtime.js";

export type SupportedLocale = "en" | "ja";

const DEFAULT_LOCALE: SupportedLocale = "en";

export const m = messages;

export function resolveSupportedLocale(
  input: string | undefined
): SupportedLocale {
  if (!input) {
    return DEFAULT_LOCALE;
  }

  const normalized = input
    .trim()
    .replace(/_/g, "-")
    .replace(/[.:].*$/, "")
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
