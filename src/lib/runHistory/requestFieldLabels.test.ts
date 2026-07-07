import { describe, expect, it } from "vitest";
import { buildRequestFieldLabelMaps, remapRequestFieldKeys } from "./requestFieldLabels";

describe("requestFieldLabels", () => {
  it("builds a field id to display name map for request nodes", () => {
    const maps = buildRequestFieldLabelMaps([
      {
        id: "req-1",
        type: "request",
        data: {
          dynamicFields: [
            { id: "field_146b9567", name: "text_field_1", type: "text", value: "hello" },
            { id: "field_image", name: "Image", type: "image", value: "" },
          ],
        },
      },
      {
        id: "llm-1",
        type: "llm",
        data: {},
      },
    ]);

    expect(maps.get("req-1")).toEqual({
      field_146b9567: "text_field_1",
      field_image: "Image",
    });
  });

  it("remaps request output keys to user-visible field names", () => {
    const remapped = remapRequestFieldKeys(
      {
        field_146b9567: "hello",
        prompt: "keep-me",
      },
      { field_146b9567: "text_field_1" },
    );

    expect(remapped).toEqual({
      text_field_1: "hello",
      prompt: "keep-me",
    });
  });
});
