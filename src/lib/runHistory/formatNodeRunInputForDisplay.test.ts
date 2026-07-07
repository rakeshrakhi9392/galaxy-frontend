import { describe, expect, it } from "vitest";
import { formatNodeRunInputForDisplay } from "./formatNodeRunInputForDisplay";

describe("formatNodeRunInputForDisplay", () => {
  it("handles nullish and empty string", () => {
    expect(formatNodeRunInputForDisplay(null)).toBe("No inputs recorded.");
    expect(formatNodeRunInputForDisplay(undefined)).toBe("No inputs recorded.");
    expect(formatNodeRunInputForDisplay("")).toBe("(empty string)");
  });

  it("truncates long strings", () => {
    const long = "a".repeat(2001);
    const formatted = formatNodeRunInputForDisplay(long);
    expect(formatted.startsWith("a".repeat(2000))).toBe(true);
    expect(formatted).toContain("2001 chars total");
  });

  it("stringifies objects and primitives", () => {
    expect(formatNodeRunInputForDisplay(42)).toBe("42");
    expect(formatNodeRunInputForDisplay(true)).toBe("true");
    expect(formatNodeRunInputForDisplay({ a: 1 })).toBe('{\n  "a": 1\n}');
  });

  it("remaps request field ids to user-visible names", () => {
    const formatted = formatNodeRunInputForDisplay(
      { field_146b9567: "hello" },
      { requestFieldLabels: { field_146b9567: "text_field_1" } },
    );

    expect(formatted).toBe('{\n  "text_field_1": "hello"\n}');
  });
});
