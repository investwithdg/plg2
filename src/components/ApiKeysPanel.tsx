/**
 * ApiKeysPanel.tsx
 *
 * Member Hub section for connecting PLG to Claude over MCP.
 *
 * Three plan states, mirroring the server-side gate in
 * supabase/functions/manage-api-keys/handler.ts:
 *   free  — upgrade prompt for the Pro "Connect to Claude" OAuth flow.
 *   pro   — OAuth connect flow (no key needed) + an Elite upsell where key generation would be.
 *           Existing keys stay visible/revocable (list + revoke are ungated by plan).
 *   elite — OAuth connect flow + full API key generation / list / revoke.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { RetroButton, RetroInput, RetroWindow } from "@/components/retro";
import { Link } from "@tanstack/react-router";
import { toast as sonnerToast } from "sonner";
import type { PlanTier } from "@/hooks/usePlanTier";

interface ApiKeySummary {
  id: string;
  name: string | null;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

// Domain-fronted proxy path (src/lib/mcpProxy.ts + server.ts) for the MCP resource server —
// what MCP clients should be given, never the raw <project-ref>.supabase.co URL.
const MCP_SERVER_URL = "https://propertylistinggenerator.com/mcp";

interface ApiKeysPanelProps {
  plan: PlanTier;
}

export default function ApiKeysPanel({ plan }: ApiKeysPanelProps) {
  const [keys, setKeys] = useState<ApiKeySummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [urlCopied, setUrlCopied] = useState(false);

  const isPaidUser = plan === "pro" || plan === "elite";
  const canCreateKeys = plan === "elite";

  const loadKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-api-keys", {
        body: { action: "list" },
      });
      if (error) throw error;
      setKeys((data?.keys as ApiKeySummary[]) ?? []);
    } catch (err) {
      console.error("Failed to load API keys:", err);
      sonnerToast.error("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isPaidUser) loadKeys();
  }, [isPaidUser]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-api-keys", {
        body: { action: "create", name: name.trim() || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      setNewKey(data.key as string);
      setName("");
      await loadKeys();
    } catch (err) {
      console.error("Failed to create API key:", err);
      sonnerToast.error(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-api-keys", {
        body: { action: "revoke", id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      sonnerToast.success("API key revoked");
      await loadKeys();
    } catch (err) {
      console.error("Failed to revoke API key:", err);
      sonnerToast.error("Failed to revoke API key");
    }
  };

  const handleCopy = async () => {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      sonnerToast.error("Copy failed — select and copy the key manually");
    }
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(MCP_SERVER_URL);
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    } catch {
      sonnerToast.error("Copy failed — select and copy the URL manually");
    }
  };

  // Pro users can't mint new keys, but any keys they already hold stay listed and revocable.
  const hasExistingKeys = (keys?.length ?? 0) > 0;

  return (
    <RetroWindow title="Connect PLG to Claude" showControls={false} className="w-full">
      <div className="win95-inset bg-[var(--win95-gray)] text-black p-4 space-y-3">
        <p className="text-win95-11 text-slate-700 max-w-lg">
          Connect PLG to Claude and generate listings straight from chat — agents can call
          generate_listing, compliance_check, and rewrite_for_channel without leaving the
          conversation.
        </p>

        {!isPaidUser ? (
          <div className="border-t border-[var(--win95-gray-dark)] pt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-win95-11 text-slate-700 max-w-md">
              Connecting PLG to Claude is available on Pro and Elite plans. Upgrade to add PLG as a
              connector on claude.ai — no API key or setup required.
            </p>
            <Link to="/pricing">
              <RetroButton variant="primary">Upgrade to Pro</RetroButton>
            </Link>
          </div>
        ) : (
          <div className="border-t border-[var(--win95-gray-dark)] pt-3 space-y-4">
            <div className="win95-raised bg-card p-3 space-y-2">
              <p className="text-win95-11 font-bold">Connect to Claude</p>
              <p className="text-win95-11 text-slate-700">
                On claude.ai: Settings → Connectors → Add custom connector. Paste this URL — no key
                needed, you'll just log in and approve.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-win95-11 bg-white win95-inset px-2 py-1 break-all">
                  {MCP_SERVER_URL}
                </code>
                <RetroButton onClick={handleCopyUrl}>{urlCopied ? "Copied!" : "Copy"}</RetroButton>
              </div>
              {canCreateKeys && (
                <p className="text-win95-11 text-slate-600">
                  Using Claude Desktop, Cursor, or another MCP client that needs a static config
                  instead? Use the same URL with an API key below.
                </p>
              )}
            </div>

            {canCreateKeys ? (
              <>
                {newKey && (
                  <div className="win95-raised bg-card p-3 space-y-2">
                    <p className="text-win95-11 font-bold text-red-800">
                      Copy this key now — it will not be shown again.
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-win95-11 bg-white win95-inset px-2 py-1 break-all">
                        {newKey}
                      </code>
                      <RetroButton onClick={handleCopy}>{copied ? "Copied!" : "Copy"}</RetroButton>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2">
                  <RetroInput
                    placeholder="Key name (e.g. Claude Desktop)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="max-w-xs"
                    maxLength={200}
                  />
                  <RetroButton onClick={handleCreate} disabled={creating} variant="primary">
                    {creating ? "Generating..." : "Generate New Key"}
                  </RetroButton>
                </div>
              </>
            ) : (
              <div className="win95-raised bg-card p-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-win95-11 text-slate-700 max-w-md">
                  Long-lived API keys — for Claude Desktop, Cursor, or other static-config MCP
                  clients — are an Elite feature.
                </p>
                <Link to="/pricing">
                  <RetroButton variant="primary">Upgrade to Elite</RetroButton>
                </Link>
              </div>
            )}

            {(canCreateKeys || hasExistingKeys) && (
              <div className="space-y-2">
                {loading && <p className="text-win95-11 text-slate-600">Loading keys...</p>}
                {!loading && canCreateKeys && keys && keys.length === 0 && (
                  <p className="text-win95-11 text-slate-600">No API keys yet.</p>
                )}
                {!loading &&
                  keys?.map((k) => (
                    <div
                      key={k.id}
                      className="win95-raised bg-card px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div>
                        <span className="text-win95-11 font-bold block">
                          {k.name || "Unnamed key"}
                        </span>
                        <span className="text-win95-11 text-slate-600">
                          {k.keyPrefix}... · created {new Date(k.createdAt).toLocaleDateString()}
                          {k.lastUsedAt
                            ? ` · last used ${new Date(k.lastUsedAt).toLocaleDateString()}`
                            : ""}
                          {k.revokedAt ? " · REVOKED" : ""}
                        </span>
                      </div>
                      {!k.revokedAt && (
                        <RetroButton onClick={() => handleRevoke(k.id)} className="text-red-800">
                          Revoke
                        </RetroButton>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>
    </RetroWindow>
  );
}
