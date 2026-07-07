import { describe, expect, it } from "vitest";
import { estimatePlaygroundCredits } from "./playgroundInputs";

describe("estimatePlaygroundCredits", () => {
  it("sums live per-node estimates instead of a flat nodeCount formula", () => {
    const graph = {
      nodes: [
        {
          id: "llm1",
          type: "llm",
          data: { inputs: { max_tokens: 1024 } },
        },
        {
          id: "merge1",
          type: "merge-av",
          data: {
            inputs: {
              video_url: "https://example.com/v.mp4",
              audio_url: "https://example.com/a.mp3",
            },
          },
        },
      ],
      edges: [],
    };

    const label = estimatePlaygroundCredits(graph);
    // llm default ~102 credits, merge-av 30_000 → total ~30_102 → "~30K"
    expect(label).toBe("~30K");
  });

  it("returns a zero-style estimate for an empty graph", () => {
    expect(estimatePlaygroundCredits({ nodes: [], edges: [] })).toMatch(/^~/);
  });
});
