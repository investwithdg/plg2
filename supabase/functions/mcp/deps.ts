// Real (Supabase-backed) implementation of McpDeps. Kept separate from handler.ts
// so the request-handling logic can be unit-tested without resolving supabase-js.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { LISTINGS_DEFAULT_LIMIT, LISTINGS_MAX_LIMIT } from "./handler.ts";
import type {
  ListingSummary,
  McpDeps,
  PlanTier,
  PropertyResearch,
  Violation,
} from "./handler.ts";
import { hashApiKey, isApiKey } from "../_shared/apiKeys.ts";
import { isMcpEligiblePlan, resolvePlanTier } from "../_shared/planTier.ts";
import { sha256Hex } from "../_shared/oauthCrypto.ts";

// Per-hour caps for Pro/Elite MCP callers. Pro/Elite skip every free-tier cap downstream in
// receive-property (see its `hasProPlan` branch) on both the web AND the MCP path — this is
// the ONLY throttle MCP traffic gets, so it needs to exist even though the equivalent web UI
// has no matching limit (a human clicking buttons can't approach these rates; an agent can).
// A tool missing from this map is unlimited (checkRateLimit returns allowed early when
// RATE_LIMITS[tool] is undefined), so every tool in handler.ts's TOOLS array needs an entry
// here or it goes unthrottled purely by omission. list_listings/get_property_research are
// read-only single-table queries with no paid API call behind them, so they're capped far
// higher than generate_listing — enough to stop a runaway agent loop, not normal agent use.
const RATE_LIMITS: Record<string, Record<"pro" | "elite", number>> = {
  generate_listing: { pro: 30, elite: 100 },
  compliance_check: { pro: 120, elite: 300 },
  rewrite_for_channel: { pro: 120, elite: 300 },
  list_listings: { pro: 200, elite: 500 },
  get_property_research: { pro: 200, elite: 500 },
};
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

// Baseline fair-housing prohibited phrases (mirrors src/lib/compliance/index.ts —
// duplicated rather than imported since Deno edge functions and the Vite/React
// frontend are separate runtimes with no shared module path in this repo).
const DEFAULT_PROHIBITED: { pattern: string; guidance: string }[] = [
  {
    pattern: "no children",
    guidance: "Familial status: describe the home, not who may live there.",
  },
  {
    pattern: "perfect for families",
    guidance: "Familial status: focus on features (e.g. 'large fenced yard').",
  },
  { pattern: "safe neighborhood", guidance: "Steering risk: avoid claims about who lives nearby." },
  {
    pattern: "walking distance to church",
    guidance: "Religion steering: state distance/amenities neutrally.",
  },
  { pattern: "exclusive", guidance: "Can imply exclusion; prefer concrete features." },
  { pattern: "master bedroom", guidance: "Many boards prefer 'primary bedroom'." },
];

const GENERATE_POLL_INTERVAL_MS = 2000;
const GENERATE_POLL_TIMEOUT_MS = 25_000;

// PostgREST's like/ilike treat BOTH "%" and "*" as wildcards. Neither, nor "_" or a backslash,
// ever appears in a legitimate "<city>, <state> <zip>" cache key, so strip them outright rather
// than trying to escape — a caller must not be able to turn an address argument into a wildcard
// scan of the whole cache.
function sanitizeKeyFragment(value: string): string {
  return value.replace(/[%_*\\]/g, "").replace(/\s+/g, " ").trim();
}

// Mirrors enrichmentCacheKey() in process-property/index.ts, which is what actually WRITES these
// rows: enrichment is cached at neighborhood level under a lowercased "<city>, <state> <zip>"
// key with the street line dropped (verified against live rows — e.g. "cleves, oh 45002",
// "indianapolis, in 46205"), plus an optional "|<property_type>" suffix so commercial and
// residential don't share enrichment. Duplicated rather than imported for the same reason
// DEFAULT_PROHIBITED above is: these two edge functions share no module path in this repo.
function researchCacheKey(query: {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}): string | null {
  if (query.address) {
    const parts = sanitizeKeyFragment(query.address).toLowerCase().split(",");
    // >= 2 parts means a street line is present and gets dropped, exactly as the writer does.
    // A single-part address stays whole — matching the legacy rows written that way.
    const base = (parts.length >= 2 ? parts.slice(1).join(",") : parts[0]).trim();
    return base || null;
  }
  const city = sanitizeKeyFragment(query.city ?? "").toLowerCase();
  const state = sanitizeKeyFragment(query.state ?? "").toLowerCase();
  const region = [state, sanitizeKeyFragment(query.zip ?? "")].filter(Boolean).join(" ");
  if (city && region) return `${city}, ${region}`;
  return city || region || null;
}

function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// api_keys / oauth_access_tokens aren't in the generated Database types yet —
// same escape hatch as mls_rules below.
function apiKeysTable(supabase: ReturnType<typeof createClient>) {
  return supabase.from("api_keys" as never) as any;
}

function oauthTokensTable(supabase: ReturnType<typeof createClient>) {
  return supabase.from("oauth_access_tokens" as never) as any;
}

// MCP/agent access is a paid-tier gate, not just an auth mechanism: free-tier users must not
// be able to successfully call tools even with a technically-valid token/session. Shared by
// every branch of verifyCaller below. Single source of truth for "what plan is this user on"
// lives in _shared/planTier.ts (mirrors src/hooks/usePlanTier.ts) — no query limit here, so
// resolvePlanTier's elite-beats-pro tie-break can see every active row, not just whichever one
// Postgres happens to return first.
async function getPlanForUser(supabase: ReturnType<typeof createClient>, userId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .eq("status", "active");
  return resolvePlanTier(data);
}

async function verifyApiKey(
  supabase: ReturnType<typeof createClient>,
  token: string,
): Promise<{ userId: string; plan: PlanTier } | null> {
  const keyHash = await hashApiKey(token);
  const { data: keyRow } = await apiKeysTable(supabase)
    .select("id, user_id, revoked_at")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();
  if (!keyRow) return null;

  // Fire-and-forget usage tracking — never let this block or fail verification.
  apiKeysTable(supabase)
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRow.id)
    .then(
      () => {},
      () => {},
    );

  const plan = await getPlanForUser(supabase, keyRow.user_id as string);
  if (!isMcpEligiblePlan(plan)) return null; // free tier: API key exists but MCP stays locked
  return { userId: keyRow.user_id as string, plan };
}

async function verifyOAuthToken(
  supabase: ReturnType<typeof createClient>,
  token: string,
): Promise<{ userId: string; plan: PlanTier } | null> {
  const tokenHash = await sha256Hex(token);
  const { data } = await oauthTokensTable(supabase)
    .select("user_id, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (!data || data.revoked_at || new Date(data.expires_at).getTime() <= Date.now()) return null;

  const userId = data.user_id as string;

  // Plans can change after a token was issued (e.g. a Pro user downgrades to
  // free) — always re-check the CURRENT plan rather than trusting that the
  // token was valid for a paid plan at issuance time.
  const plan = await getPlanForUser(supabase, userId);
  if (!isMcpEligiblePlan(plan)) return null;

  return { userId, plan };
}

async function verifySessionJwt(
  supabase: ReturnType<typeof createClient>,
  token: string,
): Promise<{ userId: string; plan: PlanTier } | null> {
  // Full Supabase user session JWT (browser-style auth). No known caller currently uses this
  // path from the website itself (generate_listing forwards into receive-property, which does
  // its own free-tier caps/Pro gating independently) — it exists so an MCP client can also
  // authenticate with a copied browser session token. Gated the same way as every other path
  // for consistency: without this, a free-tier user could trivially bypass the paid-tier gate
  // by using their own login JWT instead of an API key or OAuth token.
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) return null;
  const userId = data.claims.sub as string;
  const plan = await getPlanForUser(supabase, userId);
  if (!isMcpEligiblePlan(plan)) return null;
  return { userId, plan };
}

export function defaultDeps(): McpDeps {
  return {
    async verifyCaller(authHeader) {
      if (!authHeader?.startsWith("Bearer ")) return null;
      const token = authHeader.replace("Bearer ", "");
      const supabase = serviceClient();

      // Long-lived dashboard-issued API key (`plg_live_...`) — for static MCP client configs
      // (Claude Desktop, `claude mcp add --header`, Cursor, etc.) that can't do an interactive
      // login flow. See manage-api-keys/ for issuance and supabase/migrations/*_add_api_keys.sql.
      if (isApiKey(token)) return verifyApiKey(supabase, token);

      // OAuth access token issued via the /oauth connector flow (claude.ai's "Add custom
      // connector" and other spec-compliant MCP clients). See supabase/functions/oauth/.
      const oauthCaller = await verifyOAuthToken(supabase, token);
      if (oauthCaller) return oauthCaller;

      // Fallback: full Supabase user session JWT (the browser's existing login).
      return verifySessionJwt(supabase, token);
    },

    getProtectedResourceMetadata() {
      // MCP_PUBLIC_URL/OAUTH_PUBLIC_URL point at this app's own domain-fronted proxy paths
      // (see src/lib/mcpProxy.ts) rather than the raw <project-ref>.supabase.co URL, so MCP
      // clients only ever see propertylistinggenerator.com. Falls back to the direct Supabase
      // URL if those aren't set yet, so this stays correct before/without the proxy in place.
      const supabaseUrl = (Deno.env.get("SUPABASE_URL") ?? "").replace(/\/$/, "");
      const resource = (Deno.env.get("MCP_PUBLIC_URL") || `${supabaseUrl}/functions/v1/mcp`).replace(
        /\/$/,
        "",
      );
      const authorizationServer = (
        Deno.env.get("OAUTH_PUBLIC_URL") || `${supabaseUrl}/functions/v1/oauth`
      ).replace(/\/$/, "");
      return {
        resource,
        authorization_servers: [authorizationServer],
        bearer_methods_supported: ["header"],
        scopes_supported: ["mcp"],
      };
    },

    async invokeReceiveProperty(args, userId) {
      // receive-property can only resolve a caller's identity from a real Supabase session
      // JWT (supabase.auth.getClaims) — but MCP callers just as often authenticate via API
      // key or an opaque OAuth token, neither of which is a JWT it could verify. verifyCaller
      // has ALREADY authenticated and plan-gated this caller by the time we get here, so we
      // pass the resolved userId over a shared-secret internal channel instead of forwarding
      // the original bearer token — same pattern receive-property already uses to trust
      // process-property (x-internal-secret / PROCESS_PROPERTY_SECRET).
      const { data, error } = await serviceClient().functions.invoke("receive-property", {
        headers: {
          "x-mcp-internal-secret": Deno.env.get("MCP_INTERNAL_SECRET") ?? "",
          "x-mcp-user-id": userId,
        },
        body: args,
      });
      if (error) return { error: error.message };
      return data;
    },

    async checkRateLimit(userId, plan, tool) {
      const limit = plan === "elite" || plan === "pro" ? RATE_LIMITS[tool]?.[plan] : undefined;
      if (!limit) return { allowed: true }; // unrecognized tool: nothing to throttle here

      const supabase = serviceClient();
      const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString();
      const { count, error } = await (supabase.from("mcp_tool_calls" as never) as any)
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("tool", tool)
        .gte("created_at", windowStart);

      // Fail open: a rate-limit-check error shouldn't take down the whole tool call — this
      // mirrors receive-property's usageCheckUnavailableResponse posture (degrade gracefully
      // rather than block legitimate paid users over an infra hiccup).
      if (error) return { allowed: true };
      if ((count ?? 0) >= limit) return { allowed: false, retryAfterSeconds: 3600 };

      // Record this call. Fire-and-forget, same as api_keys.last_used_at — the rate limit is
      // a soft protection against runaway loops, not a security boundary, so a lost row under
      // rare write-failure conditions just means one ungated call, not a broken gate.
      (supabase.from("mcp_tool_calls" as never) as any)
        .insert({ user_id: userId, tool })
        .then(
          () => {},
          () => {},
        );

      return { allowed: true };
    },

    async listListings(userId, filters) {
      const supabase = serviceClient();
      const limit = Math.min(Math.max(filters.limit ?? LISTINGS_DEFAULT_LIMIT, 1), LISTINGS_MAX_LIMIT);

      // serviceClient() is the SERVICE ROLE key: RLS is bypassed entirely, so this .eq on
      // user_id is the ONLY thing scoping the result to the caller — there is no policy behind
      // it to catch a mistake. It also correctly drops the anonymous (user_id IS NULL) rows the
      // public generator creates, which belong to nobody and must not surface here.
      let query = supabase
        .from("properties")
        .select("id, address, status, created_at")
        .eq("user_id", userId);
      // Narrowing filters only — note propertyId is an additional .eq ON TOP of the user_id
      // filter, never a replacement for it, so another user's id simply returns nothing.
      if (filters.propertyId) query = query.eq("id", filters.propertyId);
      if (filters.since) query = query.gte("created_at", filters.since);

      const { data: properties, error } = await query
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error || !properties?.length) return [];

      const ids = properties.map((p) => p.id as string);
      // Safe to fetch copy by property_id alone: `ids` is already the user-scoped set from
      // above, so nothing outside the caller's own properties can be reached through it.
      const { data: copies } = await supabase
        .from("copy_generations")
        .select("property_id, copy_type, content, created_at")
        .in("property_id", ids)
        .order("created_at", { ascending: true });

      const byProperty = new Map<string, Record<string, string>>();
      for (const c of copies ?? []) {
        const propertyId = c.property_id as string;
        const bucket = byProperty.get(propertyId) ?? {};
        // Ascending order above means a later regeneration of the same copy_type overwrites the
        // earlier one, so each field ends up holding the newest version.
        bucket[c.copy_type as string] = (c.content as string) ?? "";
        byProperty.set(propertyId, bucket);
      }

      return properties.map((p) => {
        const copy = byProperty.get(p.id as string) ?? {};
        const listing: ListingSummary = {
          propertyId: p.id as string,
          address: (p.address as string) ?? "",
          status: (p.status as string) ?? "unknown",
          createdAt: p.created_at as string,
        };
        // copy_type is mls | social | email in the DB; omit rather than emit empty keys for a
        // listing that hasn't finished generating.
        if (copy.mls) listing.mls = copy.mls;
        if (copy.social) listing.social = copy.social;
        if (copy.email) listing.email = copy.email;
        return listing;
      });
    },

    async getPropertyResearch(query) {
      const key = researchCacheKey(query);
      if (!key) return null;
      const supabase = serviceClient();

      // No user_id filter here, deliberately: enrichment_cache is shared neighborhood market
      // data keyed only by area, not owned by anyone. A prefix match picks up the optional
      // "|<property_type>" suffix variants alongside the bare key.
      const select = "cache_key, enrichment_data, created_at";
      let { data } = await supabase
        .from("enrichment_cache")
        .select(select)
        .like("cache_key", `${key}%`)
        .order("created_at", { ascending: false })
        .limit(5);

      // A zip-only lookup can't reconstruct the leading city the key starts with, so fall back
      // to a contains match on the zip itself.
      if (!data?.length && query.zip) {
        const zip = sanitizeKeyFragment(query.zip);
        if (zip) {
          ({ data } = await supabase
            .from("enrichment_cache")
            .select(select)
            .like("cache_key", `%${zip}%`)
            .order("created_at", { ascending: false })
            .limit(5));
        }
      }
      if (!data?.length) return null;

      // Prefer an exact key hit; otherwise the newest of the prefix/contains matches.
      const row = data.find((r) => r.cache_key === key) ?? data[0];
      const e = (row.enrichment_data ?? {}) as Record<string, unknown>;

      // perplexity_raw is deliberately NOT selected or returned: it's the unparsed provider
      // response envelope (message wrapper, token usage, internal metadata) behind this cached
      // record — large, internal, and adding nothing over the parsed fields below.
      const research: PropertyResearch = {
        matched_key: row.cache_key as string,
        researched_at: row.created_at as string,
        schools: e.schools ?? [],
        transit_options: e.transit_options ?? [],
        nearby_amenities: e.nearby_amenities ?? [],
        walkability_score: typeof e.walkability_score === "number" ? e.walkability_score : null,
        market_overview: typeof e.market_overview === "string" ? e.market_overview : "",
        median_home_value: typeof e.median_home_value === "number" ? e.median_home_value : null,
        // Only present on rows written after the key_sources migration; older cached rows
        // legitimately have none (process-property treats those as legacy and re-enriches).
        key_sources: e.key_sources ?? [],
      };
      return research;
    },

    async waitForCompletion(propertyId) {
      const supabase = serviceClient();
      const deadline = Date.now() + GENERATE_POLL_TIMEOUT_MS;
      while (Date.now() < deadline) {
        const { data: property } = await supabase
          .from("properties")
          .select("status")
          .eq("id", propertyId)
          .maybeSingle();
        if (property?.status === "complete") {
          const { data: copies } = await supabase
            .from("copy_generations")
            .select("copy_type, content")
            .eq("property_id", propertyId);
          const result: Record<string, unknown> = { status: "complete" };
          for (const c of copies ?? []) result[c.copy_type as string] = c.content;
          return result;
        }
        if (property?.status === "error") return { status: "error" };
        await new Promise((r) => setTimeout(r, GENERATE_POLL_INTERVAL_MS));
      }
      return null;
    },

    async checkCompliance(text, board = "default") {
      const hay = text.toLowerCase();
      const violations: Violation[] = [];

      for (const r of DEFAULT_PROHIBITED) {
        if (hay.includes(r.pattern))
          violations.push({ pattern: r.pattern, severity: "error", guidance: r.guidance });
      }

      try {
        // mls_rules isn't in the generated types (frontend or edge); same as
        // src/lib/compliance/index.ts, this degrades to baseline-only if the
        // migration isn't applied yet.
        const { data } = await (serviceClient().from("mls_rules" as never) as any)
          .select("pattern, severity, guidance")
          .eq("active", true)
          .in("board", [board, "default"]);
        for (const rule of data ?? []) {
          if (hay.includes(String(rule.pattern).toLowerCase())) {
            violations.push({
              pattern: String(rule.pattern),
              severity: rule.severity === "warning" ? "warning" : "error",
              guidance: rule.guidance ?? undefined,
            });
          }
        }
      } catch {
        // mls_rules not migrated yet / offline -> baseline only.
      }

      return { passed: violations.filter((v) => v.severity === "error").length === 0, violations };
    },
  };
}
