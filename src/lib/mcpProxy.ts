// Fronts the Supabase-hosted MCP resource server and OAuth 2.1 authorization server under
// this app's own domain, so MCP clients (claude.ai "Add custom connector", Claude Desktop,
// Cursor, etc.) never need the raw <project-ref>.supabase.co URL. This runs at the Cloudflare
// Worker level (see server.ts) — before the TanStack Start SSR handler — so these paths never
// touch React Router and every method/header/body passes straight through untouched.
//
//   /mcp[/*]          -> supabase/functions/v1/mcp[/*]     (the MCP resource server)
//   /oauth-server[/*] -> supabase/functions/v1/oauth[/*]   (the OAuth 2.1 authorization server)
//
// Deliberately NOT /oauth/* for the authorization server — that path is already the frontend's
// own /oauth/authorize consent-screen page (src/routes/oauth/authorize.tsx), which calls the
// oauth function directly via supabase-js and isn't part of this proxy.

const PROXY_ROUTES = [
  { prefix: "/mcp", target: "/functions/v1/mcp" },
  { prefix: "/oauth-server", target: "/functions/v1/oauth" },
] as const;

/** Pure path-mapping logic, split out from proxyMcpRequest so it's unit-testable without fetch. */
export function resolveProxyTarget(
  pathname: string,
  search: string,
  supabaseUrl: string,
): string | null {
  const route = PROXY_ROUTES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  if (!route) return null;
  const rest = pathname.slice(route.prefix.length);
  return `${supabaseUrl.replace(/\/$/, "")}${route.target}${rest}${search}`;
}

// These describe the upstream Supabase response, not this proxied one (which has a different
// body encoding/length once `fetch` has already decompressed it) — forwarding them verbatim
// would make the client fail to decode the body or hang waiting for bytes that never arrive.
const STRIP_RESPONSE_HEADERS = [
  "content-encoding",
  "content-length",
  "transfer-encoding",
  "connection",
];

export async function proxyMcpRequest(
  request: Request,
  supabaseUrl: string | undefined,
): Promise<Response | null> {
  if (!supabaseUrl) return null;
  const url = new URL(request.url);
  const target = resolveProxyTarget(url.pathname, url.search, supabaseUrl);
  if (!target) return null;

  const headers = new Headers(request.headers);
  headers.delete("host");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const upstream = await fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: "manual",
    // Cloudflare's fetch requires this when streaming a request body.
    ...(hasBody ? { duplex: "half" } : {}),
  } as RequestInit);

  const responseHeaders = new Headers(upstream.headers);
  for (const h of STRIP_RESPONSE_HEADERS) responseHeaders.delete(h);

  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
