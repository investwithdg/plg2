// Per-request CORS allowlist. Access-Control-Allow-Origin echoes the caller's
// Origin only when it matches an approved production/preview/dev host — never
// a bare "*". Unrecognized origins fall back to the production origin, which
// the browser will reject anyway since it won't match the request's actual
// Origin.
const STATIC_ALLOWED_ORIGINS = new Set([
  "https://propertylistinggenerator.com",
  "https://www.propertylistinggenerator.com",
]);

// Lovable preview deployments and local dev.
const ALLOWED_ORIGIN_SUFFIXES = [".lovable.app", ".lovableproject.com"];
const LOCAL_ORIGIN_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const DEFAULT_ORIGIN = "https://propertylistinggenerator.com";

function isAllowedOrigin(origin: string | null): origin is string {
  if (!origin) return false;
  if (STATIC_ALLOWED_ORIGINS.has(origin)) return true;
  if (LOCAL_ORIGIN_PATTERN.test(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return ALLOWED_ORIGIN_SUFFIXES.some((suffix) => hostname.endsWith(suffix));
  } catch {
    return false;
  }
}

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin");
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin : DEFAULT_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}

// Public OAuth authorization-server endpoints (metadata discovery, dynamic
// client registration, token exchange) and the MCP resource server's protected-
// resource metadata must be reachable by arbitrary third-party MCP clients
// (claude.ai, Claude Desktop, etc.) whose origins we can't allowlist in advance.
// Unlike the rest of the app, CORS is not a security boundary for these routes —
// they're protected by the OAuth mechanics themselves (PKCE, exact redirect_uri
// matching, and the secrecy of codes/tokens), so a permissive "*" is intentional.
export function getPublicCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, content-type",
  };
}
