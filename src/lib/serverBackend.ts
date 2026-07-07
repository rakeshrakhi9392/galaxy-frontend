import "server-only";

import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AUTH_CONTEXT_HEADER, encodeAuthContext } from "./authContext";
import { backendFetch } from "./backend";

export async function serverBackendFetch(path: string, init?: RequestInit) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const authContext = await encodeAuthContext({
    userId,
    method: "clerk",
  });

  return backendFetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      [AUTH_CONTEXT_HEADER]: authContext,
    },
  });
}
