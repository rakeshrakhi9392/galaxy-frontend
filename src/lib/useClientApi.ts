"use client";

import { useAuth } from "@clerk/nextjs";
import { useCallback } from "react";
import {
  clientFetch as rawClientFetch,
  clientRequest as rawClientRequest,
  clientRequestWithRetry as rawClientRequestWithRetry,
  clientEventsUrl as rawClientEventsUrl,
  type FetchWithRetryOptions,
} from "./backend";

export class AuthRequiredError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export function useClientApi() {
  const { getToken } = useAuth();

  const withAuth = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getToken();
      if (!token) {
        throw new AuthRequiredError();
      }
      return {
        path,
        init: {
          ...init,
          headers: {
            ...(init?.headers ?? {}),
            Authorization: `Bearer ${token}`,
          },
        },
      };
    },
    [getToken],
  );

  const clientFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const authed = await withAuth(path, init);
      return rawClientFetch(authed.path, authed.init);
    },
    [withAuth],
  );

  /** Like clientFetch, but returns the Response for non-2xx statuses instead of throwing. */
  const clientRequest = useCallback(
    async (path: string, init?: RequestInit) => {
      const authed = await withAuth(path, init);
      return rawClientRequest(authed.path, authed.init);
    },
    [withAuth],
  );

  const clientRequestWithRetry = useCallback(
    async (path: string, init?: RequestInit, options?: FetchWithRetryOptions) => {
      const authed = await withAuth(path, init);
      return rawClientRequestWithRetry(authed.path, authed.init, options);
    },
    [withAuth],
  );

  const clientEventsUrl = useCallback(
    async (path: string) => {
      const token = await getToken();
      if (!token) {
        throw new AuthRequiredError();
      }

      const tokenPath = path.replace(/\/events$/, "/events/token");
      const res = await rawClientFetch(tokenPath, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = (await res.json()) as { sseToken: string };

      const base = rawClientEventsUrl(path);
      const separator = base.includes("?") ? "&" : "?";
      return `${base}${separator}sseToken=${encodeURIComponent(json.sseToken)}`;
    },
    [getToken],
  );

  return { clientFetch, clientRequest, clientRequestWithRetry, clientEventsUrl };
}
