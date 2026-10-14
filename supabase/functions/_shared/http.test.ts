import { assertEquals, assertRejects } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { fetchWithRetry } from "./http.ts";

Deno.test("fetchWithRetry - success on first attempt", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;
  
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    fetchCallCount++;
    return new Response("ok", { status: 200 });
  }) as typeof fetch;

  try {
    const response = await fetchWithRetry("http://example.com", {}, "Test", "prop123");
    assertEquals(response.status, 200);
    assertEquals(fetchCallCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("fetchWithRetry - retries on 429 and succeeds", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;
  
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    fetchCallCount++;
    if (fetchCallCount === 1) {
      return new Response("Too Many Requests", { status: 429 });
    }
    return new Response("ok", { status: 200 });
  }) as typeof fetch;

  try {
    const response = await fetchWithRetry("http://example.com", {}, "Test", "prop123");
    assertEquals(response.status, 200);
    assertEquals(fetchCallCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

Deno.test("fetchWithRetry - fails after max attempts", async () => {
  const originalFetch = globalThis.fetch;
  let fetchCallCount = 0;
  
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    fetchCallCount++;
    return new Response("Too Many Requests", { status: 429 });
  }) as typeof fetch;

  try {
    await assertRejects(
      () => fetchWithRetry("http://example.com", {}, "Test", "prop123", 2),
      Error,
      "Test failed after 2 attempts [429]: Too Many Requests"
    );
    assertEquals(fetchCallCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
