// Real (Supabase-backed) implementation of OAuthDeps. Kept separate from
// handler.ts so the request-handling logic can be unit-tested without
// resolving supabase-js.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import type {
  NewClientInput,
  OAuthDeps,
  SavedClientResult,
  StoredAuthorizationCode,
  StoredClient,
} from "./handler.ts";
import { generateOpaqueToken, sha256Hex, type PlanTier } from "../_shared/oauthCrypto.ts";

function serviceClient() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

// oauth_clients / oauth_authorization_codes / oauth_access_tokens aren't in the
// generated Database types (same situation as mls_rules in supabase/functions/mcp/deps.ts —
// no shared type-gen path between this repo's migrations and the edge function
// runtime), so we cast through `as never` / `as any` at the query boundary here
// and map rows to typed shapes by hand below.

interface ClientRow {
  client_id: string;
  client_secret_hash: string | null;
  client_name: string | null;
  redirect_uris: string[];
  grant_types: string[];
  response_types: string[];
  token_endpoint_auth_method: string;
  scope: string | null;
  created_at: string;
}

function rowToStoredClient(row: ClientRow): StoredClient {
  return {
    clientId: row.client_id,
    clientSecretHash: row.client_secret_hash,
    clientName: row.client_name,
    redirectUris: row.redirect_uris,
    grantTypes: row.grant_types,
    responseTypes: row.response_types,
    tokenEndpointAuthMethod: row.token_endpoint_auth_method,
    scope: row.scope,
  };
}

export function defaultDeps(): OAuthDeps {
  return {
    async getClient(clientId) {
      const { data, error } = await (serviceClient().from("oauth_clients" as never) as any)
        .select("*")
        .eq("client_id", clientId)
        .maybeSingle();
      if (error || !data) return null;
      return rowToStoredClient(data as ClientRow);
    },

    async saveClient(input: NewClientInput): Promise<SavedClientResult> {
      let clientSecret: string | null = null;
      let clientSecretHash: string | null = null;
      if (input.wantsSecret) {
        clientSecret = generateOpaqueToken();
        clientSecretHash = await sha256Hex(clientSecret);
      }
      const { data, error } = await (serviceClient().from("oauth_clients" as never) as any)
        .insert({
          client_secret_hash: clientSecretHash,
          client_name: input.clientName,
          redirect_uris: input.redirectUris,
          grant_types: input.grantTypes,
          response_types: input.responseTypes,
          token_endpoint_auth_method: input.tokenEndpointAuthMethod,
          scope: input.scope,
          metadata: {
            client_uri: input.clientUri,
            logo_uri: input.logoUri,
            contacts: input.contacts,
            tos_uri: input.tosUri,
            policy_uri: input.policyUri,
            software_id: input.softwareId,
            software_version: input.softwareVersion,
          },
        })
        .select("*")
        .single();
      if (error || !data) throw new Error(error?.message ?? "Failed to register OAuth client");
      const row = data as ClientRow;
      return {
        ...rowToStoredClient(row),
        clientIdIssuedAt: Math.floor(new Date(row.created_at).getTime() / 1000),
        clientSecret,
        clientSecretExpiresAt: 0, // never expires (v1: no secret rotation)
      };
    },

    async verifySessionUser(authHeader) {
      if (!authHeader?.startsWith("Bearer ")) return null;
      const token = authHeader.replace("Bearer ", "");
      const { data, error } = await serviceClient().auth.getClaims(token);
      if (error || !data?.claims) return null;
      return { userId: data.claims.sub as string };
    },

    async getUserPlan(userId): Promise<PlanTier> {
      // Mirrors src/hooks/usePlanTier.ts exactly (same table/columns/filter) so
      // the gate here always agrees with what the frontend shows the user.
      const { data } = await serviceClient()
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .eq("status", "active")
        .limit(1);
      const activeRow = (data ?? []).find(
        (row: { plan?: string; status?: string }) => row.status === "active",
      );
      if (activeRow?.plan === "elite") return "elite";
      if (activeRow?.plan === "pro") return "pro";
      return "free";
    },

    async saveAuthorizationCode(record) {
      const { error } = await (
        serviceClient().from("oauth_authorization_codes" as never) as any
      ).insert({
        code_hash: record.codeHash,
        client_id: record.clientId,
        user_id: record.userId,
        redirect_uri: record.redirectUri,
        code_challenge: record.codeChallenge,
        code_challenge_method: record.codeChallengeMethod,
        resource: record.resource,
        scope: record.scope,
        expires_at: new Date(record.expiresAt).toISOString(),
      });
      if (error) throw new Error(error.message);
    },

    async consumeAuthorizationCode(codeHash): Promise<StoredAuthorizationCode | null> {
      // Atomic claim: only succeeds (and returns a row) if the code exists and
      // hasn't been used yet, which is what makes this replay-safe under
      // concurrent redemption attempts.
      const { data, error } = await (
        serviceClient().from("oauth_authorization_codes" as never) as any
      )
        .update({ used_at: new Date().toISOString() })
        .eq("code_hash", codeHash)
        .is("used_at", null)
        .select("*")
        .maybeSingle();
      if (error || !data) return null;
      return {
        clientId: data.client_id,
        userId: data.user_id,
        redirectUri: data.redirect_uri,
        codeChallenge: data.code_challenge,
        codeChallengeMethod: data.code_challenge_method,
        resource: data.resource,
        scope: data.scope,
        expiresAt: new Date(data.expires_at).getTime(),
      };
    },

    async saveAccessToken(record) {
      const { error } = await (serviceClient().from("oauth_access_tokens" as never) as any).insert({
        token_hash: record.tokenHash,
        user_id: record.userId,
        client_id: record.clientId,
        scope: record.scope,
        expires_at: new Date(record.expiresAt).toISOString(),
      });
      if (error) throw new Error(error.message);
    },

    now() {
      return Date.now();
    },
  };
}
