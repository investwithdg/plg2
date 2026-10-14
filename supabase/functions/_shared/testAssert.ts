// Minimal, dependency-free assertion helper for edge function smoke tests.
// Avoids relying on jsr:@std/assert or deno.land being reachable at test time.
export function assertEquals(actual: unknown, expected: unknown, msg?: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(msg ?? `assertEquals failed:\n  actual:   ${a}\n  expected: ${e}`);
  }
}
