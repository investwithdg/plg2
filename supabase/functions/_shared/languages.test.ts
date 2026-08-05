import { assertEquals } from "./testAssert.ts";
import { getLanguageLabel, isSupportedLanguage, SUPPORTED_LANGUAGES } from "./languages.ts";

Deno.test("isSupportedLanguage: accepts every code in the registry", () => {
  for (const { code } of SUPPORTED_LANGUAGES) {
    assertEquals(isSupportedLanguage(code), true, `${code} should be supported`);
  }
});

Deno.test("isSupportedLanguage: rejects unknown, null, undefined, and empty codes", () => {
  assertEquals(isSupportedLanguage("xx"), false);
  assertEquals(isSupportedLanguage("en"), false); // English isn't a "secondary" language
  assertEquals(isSupportedLanguage(null), false);
  assertEquals(isSupportedLanguage(undefined), false);
  assertEquals(isSupportedLanguage(""), false);
});

Deno.test("getLanguageLabel: resolves known codes, falls back to the code itself", () => {
  assertEquals(getLanguageLabel("es"), "Spanish");
  assertEquals(getLanguageLabel("zz"), "zz");
});
