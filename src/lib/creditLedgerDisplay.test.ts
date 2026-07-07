import { describe, expect, it } from "vitest";
import type { CreditTransaction } from "@/lib/types";
import {
  creditTxnTypeLabel,
  formatCreditTxnAmount,
  formatCreditTxnDescription,
} from "@/lib/creditLedgerDisplay";

describe("creditLedgerDisplay", () => {
  it("formats charge amounts as negative", () => {
    expect(
      formatCreditTxnAmount({
        type: "RUN_CHARGE",
        amount: 210_000,
      } as CreditTransaction),
    ).toBe("-210,000");
  });

  it("formats grant amounts as positive", () => {
    expect(
      formatCreditTxnAmount({
        type: "GRANT",
        amount: 100_000_000,
      } as CreditTransaction),
    ).toBe("+100,000,000");
  });

  it("describes run charges with node type metadata", () => {
    expect(
      formatCreditTxnDescription({
        type: "RUN_CHARGE",
        metadata: { nodeType: "gpt-image-2" },
      } as CreditTransaction),
    ).toBe("Node run · gpt-image-2");
  });

  it("labels transaction types for display", () => {
    expect(creditTxnTypeLabel("GRANT")).toBe("Grant");
    expect(creditTxnTypeLabel("RUN_CHARGE")).toBe("Run charge");
  });
});
