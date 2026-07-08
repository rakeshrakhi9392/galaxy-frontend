import { http, HttpResponse } from "msw";

/** Default MSW handlers for frontend integration tests (external API boundary). */
export const defaultHandlers = [
  http.get("*/api/v1/workflows", () =>
    HttpResponse.json({
      workflows: [],
      page: 1,
      pageSize: 20,
      total: 0,
      hasMore: false,
    }),
  ),
  http.get("*/api/v1/system-workflows", () =>
    HttpResponse.json({
      items: [],
    }),
  ),
];
