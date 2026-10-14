const URL_IN_TEXT_RE = /https?:\/\/[^\s<>"']+/i;
const ZILLOW_HOST_RE = /(?:^|\s)(?:www\.)?zillow\.com\/[^\s<>"']+/i;

export type ParsedPropertyInput = {
  url?: string;
  address?: string;
};

/** Strip trailing punctuation often copied with share links. */
function cleanUrl(raw: string): string {
  return raw.replace(/[),.;!?]+$/g, "");
}

/**
 * Normalize pasted input: Zillow "Share" often copies price/beds text plus a URL,
 * or a host-only link without https://.
 */
export function parsePropertyInput(raw: string): ParsedPropertyInput {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  const httpMatch = trimmed.match(URL_IN_TEXT_RE);
  if (httpMatch) {
    return { url: cleanUrl(httpMatch[0]) };
  }

  const zillowMatch = trimmed.match(ZILLOW_HOST_RE);
  if (zillowMatch) {
    const path = zillowMatch[0].trim();
    const withScheme = path.startsWith("www.") ? `https://${path}` : `https://${path}`;
    return { url: cleanUrl(withScheme) };
  }

  if (/^www\./i.test(trimmed)) {
    return { url: cleanUrl(`https://${trimmed}`) };
  }

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return { url: cleanUrl(trimmed) };
  }

  return { address: trimmed };
}

export async function describeFunctionInvokeError(error: unknown): Promise<string> {
  if (!error || typeof error !== "object") {
    return "Please check the address or URL and try again.";
  }

  const err = error as {
    message?: string;
    context?: { json?: () => Promise<unknown> };
  };

  if (err.context?.json) {
    try {
      const body = (await err.context.json()) as Record<string, unknown>;
      if (typeof body.message === "string" && body.message) return body.message;
      if (typeof body.error === "string" && body.error) {
        if (body.error === "free_limit_exceeded") {
          return typeof body.message === "string"
            ? body.message
            : "Free generation limit reached. Sign in or try again later.";
        }
        return body.error;
      }
      if (typeof body.details === "string" && body.details) return body.details;
    } catch {
      /* ignore parse errors */
    }
  }

  if (err.message) return err.message;
  return "Please check the address or URL and try again.";
}
