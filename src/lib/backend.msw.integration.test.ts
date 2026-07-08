import { http, HttpResponse } from "msw";
import { describe, expect, it } from "vitest";
import { mswServer } from "@/test/msw/server";
import { clientRequestWithRetry } from "./backend";

describe("clientRequestWithRetry (MSW integration)", () => {
  it("loads workflow list from a mocked API boundary", async () => {
    mswServer.use(
      http.get("*/api/v1/workflows", () =>
        HttpResponse.json({
          workflows: [
            {
              id: "wf_1",
              name: "Demo Workflow",
              updatedAt: "2026-07-08T00:00:00.000Z",
              createdAt: "2026-07-08T00:00:00.000Z",
            },
          ],
          page: 1,
          pageSize: 20,
          total: 1,
          hasMore: false,
        }),
      ),
    );

    const res = await clientRequestWithRetry("/api/v1/workflows?page=1&pageSize=20");
    expect(res.ok).toBe(true);

    const body = (await res.json()) as {
      workflows: Array<{ id: string; name: string }>;
      total: number;
    };
    expect(body.total).toBe(1);
    expect(body.workflows[0]?.name).toBe("Demo Workflow");
  });

  it("retries transient HTTP statuses against MSW", async () => {
    let attempts = 0;

    mswServer.use(
      http.get("*/api/v1/credits/balance", () => {
        attempts += 1;
        if (attempts === 1) {
          return new HttpResponse("bad gateway", { status: 502 });
        }
        return HttpResponse.json({
          availableBalance: 1_000,
          formatted: "1K",
          hasActiveSubscription: true,
          isOrganization: false,
        });
      }),
    );

    const res = await clientRequestWithRetry("/api/v1/credits/balance");
    expect(res.ok).toBe(true);
    expect(attempts).toBe(2);
  });
});
