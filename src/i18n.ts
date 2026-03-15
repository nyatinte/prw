import osLocale from "os-locale";

// biome-ignore lint/performance/noBarrelFile: re-export paraglide messages as single entry point
export { m } from "#paraglide/messages.js";

import { baseLocale, locales, overwriteGetLocale } from "#paraglide/runtime.js";

export function initializeLocale(): void {
  const tag = osLocale();
  let language: string;
  try {
    language = new Intl.Locale(tag).language;
  } catch {
    language = baseLocale;
  }
  const locale = locales.find((l) => l === language) ?? baseLocale;
  overwriteGetLocale(() => locale);
}
