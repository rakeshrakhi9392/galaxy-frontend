"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { useClientApi } from "@/lib/useClientApi";

type ApiKeyRecord = {
  id: string;
  name: string;
  keyPrefix: string;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
};

function formatDate(value: string | null): string {
  if (!value) return "Never";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ApiKeysClient() {
  const { clientFetch, clientRequest } = useClientApi();
  const [apiKeys, setApiKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await clientFetch("/api/v1/api-keys");
      const json = (await res.json()) as { apiKeys: ApiKeyRecord[] };
      setApiKeys(json.apiKeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [clientFetch]);

  useEffect(() => {
    void loadKeys();
  }, [loadKeys]);

  const createKey = async () => {
    const name = newKeyName.trim();
    if (!name) return;
    setCreating(true);
    setError(null);
    try {
      const res = await clientRequest("/api/v1/api-keys", {
        method: "POST",
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: { message?: string } };
        throw new Error(json.error?.message ?? "Failed to create API key");
      }
      const json = (await res.json()) as { secret: string };
      setCreatedSecret(json.secret);
      setNewKeyName("");
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key");
    } finally {
      setCreating(false);
    }
  };

  const revokeKey = async (id: string) => {
    if (!window.confirm("Revoke this API key? Applications using it will stop working.")) return;
    setError(null);
    try {
      const res = await clientRequest(`/api/v1/api-keys/${id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        throw new Error("Failed to revoke API key");
      }
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke API key");
    }
  };

  const copySecret = async () => {
    if (!createdSecret) return;
    try {
      await navigator.clipboard.writeText(createdSecret);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-space-default-padding py-space-07">
      <div className="mb-space-06 flex items-start justify-between gap-space-04">
        <div>
          <h1 className="text-heading-lg text-text-primary">API Keys</h1>
          <p className="mt-space-02 text-body text-text-secondary">
            Create keys for programmatic access to the Galaxy REST API. Keys are prefixed with{" "}
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">gal_</code>.
          </p>
        </div>
        <a
          href="https://galaxy-api.mintlify.app/introduction"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-sm text-indigo-600 hover:underline"
        >
          API docs →
        </a>
      </div>

      {createdSecret ? (
        <div className="mb-space-06 rounded-radius-xl border border-amber-200 bg-amber-50 p-space-05 dark:border-amber-900 dark:bg-amber-950/40">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            Copy your API key now — it won&apos;t be shown again.
          </p>
          <div className="mt-space-03 flex items-center gap-space-03">
            <code className="min-w-0 flex-1 truncate rounded-radius-l bg-white px-space-03 py-space-02 font-mono text-xs dark:bg-zinc-900">
              {createdSecret}
            </code>
            <button
              type="button"
              onClick={() => void copySecret()}
              className="inline-flex h-9 items-center gap-1.5 rounded-[18px] border border-gray-200 bg-white px-3 text-xs font-medium hover:bg-gray-50"
            >
              <Copy className="h-3.5 w-3.5" aria-hidden="true" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCreatedSecret(null)}
            className="mt-space-03 text-xs text-amber-800 underline dark:text-amber-200"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="mb-space-06 rounded-radius-xl border border-boarder-tertiary bg-surface-main-background-2 p-space-05">
        <h2 className="text-heading-sm mb-space-03 text-text-primary">Create new key</h2>
        <div className="flex flex-col gap-space-03 sm:flex-row">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            placeholder="Key name (e.g. Production)"
            className="h-10 flex-1 rounded-radius-l border border-boarder-tertiary bg-surface-main-background-3 px-space-04 text-sm"
            maxLength={120}
          />
          <button
            type="button"
            disabled={creating || !newKeyName.trim()}
            onClick={() => void createKey()}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-[18px] bg-indigo-600 px-4 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {creating ? "Creating…" : "Create key"}
          </button>
        </div>
      </div>

      {error ? (
        <div className="mb-space-04 rounded-radius-l border border-red-200 bg-red-50 px-space-04 py-space-03 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-radius-xl border border-boarder-tertiary bg-surface-main-background-2">
        <div className="border-b border-boarder-tertiary px-space-05 py-space-04">
          <h2 className="text-heading-sm text-text-primary">Your keys</h2>
        </div>

        {loading ? (
          <p className="px-space-05 py-space-06 text-sm text-text-secondary">Loading…</p>
        ) : apiKeys.length === 0 ? (
          <div className="flex flex-col items-center gap-space-03 px-space-05 py-space-08 text-center">
            <KeyRound className="h-8 w-8 text-text-tertiary" aria-hidden="true" />
            <p className="text-sm text-text-secondary">No API keys yet.</p>
          </div>
        ) : (
          <ul className="divide-y divide-boarder-tertiary">
            {apiKeys.map((key) => (
              <li
                key={key.id}
                className="flex items-center justify-between gap-space-04 px-space-05 py-space-04"
              >
                <div className="min-w-0">
                  <div className="font-medium text-text-primary">{key.name}</div>
                  <div className="mt-0.5 font-mono text-xs text-text-secondary">
                    {key.keyPrefix}…
                  </div>
                  <div className="mt-1 text-xs text-text-tertiary">
                    Created {formatDate(key.createdAt)}
                    {key.lastUsedAt ? ` · Last used ${formatDate(key.lastUsedAt)}` : ""}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void revokeKey(key.id)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-[18px] px-3 text-xs font-medium text-red-600 hover:bg-red-50"
                  aria-label={`Revoke ${key.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
