// Real (Supabase-backed) implementation of ManageApiKeysDeps. Kept separate from handler.ts
// so the request-handling/plan-gating logic can be unit-tested without resolving supabase-js.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { apiKeyDisplayPrefix, generateApiKey, hashApiKey } from "../_shared/apiKeys.ts";
import { resolvePlanTier } from "../_shared/planTier.ts";
import type {
  ApiKeySummary,
  CreateApiKeyResult,
  ManageApiKeysDeps,
  PlanTier,
  VerifyCallerResult,
} from "./handler.ts";

function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// api_keys isn't in the generated Database types yet (same situation as mls_rules in
// supabase/functions/mcp/deps.ts) — use the repo's established escape hatch.
function apiKeysTable(supabase: ReturnType<typeof createClient>) {
  return supabase.from("api_keys" as never) as any;
}

export function defaultDeps(): ManageApiKeysDeps {
  const supabase = serviceClient();

  return {
    async verifyCaller(authHeader): Promise<VerifyCallerResult> {
      // Dashboard callers only — always a full Supabase user session JWT, never a
      // plg_live_ API key (API keys exist to call the MCP server, not to manage themselves).
      if (!authHeader?.startsWith("Bearer ")) return { ok: false, reason: "no_token" };
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await supabase.auth.getClaims(token);
      if (error || !data?.claims) return { ok: false, reason: "invalid_token" };
      return { ok: true, userId: data.claims.sub as string };
    },

    async getUserPlan(userId): Promise<PlanTier> {
      const { data } = await supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1);
      return resolvePlanTier(data);
    },

    async createApiKey(userId, name): Promise<CreateApiKeyResult> {
      const plaintext = generateApiKey();
      const keyHash = await hashApiKey(plaintext);
      const keyPrefix = apiKeyDisplayPrefix(plaintext);

      const { data, error } = await apiKeysTable(supabase)
        .insert({ user_id: userId, name: name ?? null, key_prefix: keyPrefix, key_hash: keyHash })
        .select("id, name, key_prefix, created_at")
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "Failed to create API key");
      }

      return {
        id: data.id as string,
        name: (data.name as string | null) ?? null,
        keyPrefix: data.key_prefix as string,
        key: plaintext,
        createdAt: data.created_at as string,
      };
    },

    async listApiKeys(userId): Promise<ApiKeySummary[]> {
      // Explicit column list — key_hash (and the plaintext, which is never stored) must
      // never reach the client, and RLS alone isn't relied on to guarantee that here.
      const { data, error } = await apiKeysTable(supabase)
        .select("id, name, key_prefix, created_at, last_used_at, revoked_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) throw new Error(error.message);

      return (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        name: (row.name as string | null) ?? null,
        keyPrefix: row.key_prefix as string,
        createdAt: row.created_at as string,
        lastUsedAt: (row.last_used_at as string | null) ?? null,
        revokedAt: (row.revoked_at as string | null) ?? null,
      }));
    },

    async revokeApiKey(userId, keyId) {
      const { data, error } = await apiKeysTable(supabase)
        .update({ revoked_at: new Date().toISOString() })
        .eq("id", keyId)
        .eq("user_id", userId)
        .is("revoked_at", null)
        .select("id")
        .maybeSingle();

      if (error) return { ok: false, error: error.message };
      if (!data) return { ok: false, error: "not_found" };
      return { ok: true };
    },
  };
}
