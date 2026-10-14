export const REQUEST_TIMEOUT_MS = 60_000;

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string,
  propertyId: string,
  maxAttempts = 3,
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      const res = await fetch(url, { ...init, signal: controller.signal });
      clearTimeout(timeout);
      if (res.status === 429 || res.status >= 500) {
        const body = await res.text();
        console.log(JSON.stringify({
          propertyId,
          step: `${label}_retry`,
          attempt,
          status: res.status,
          body: body.slice(0, 200),
          t: new Date().toISOString(),
        }));
        if (attempt === maxAttempts) {
          throw new Error(
            `${label} failed after ${maxAttempts} attempts [${res.status}]: ${body.slice(0, 200)}`,
          );
        }
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
        continue;
      }
      return res;
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt - 1)));
    }
  }
  throw lastErr;
}
