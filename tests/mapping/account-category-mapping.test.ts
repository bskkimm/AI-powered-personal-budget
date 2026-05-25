import { describe, it, expect } from "vitest";
import {
  resolveAccountMapping,
  resolveCategoryMapping,
  getDefaultAccountMappings,
  getDefaultCategoryMappings,
} from "@ai-budget/core";

describe("resolveAccountMapping", () => {
  it("should map paypay source_name to PayPay account", () => {
    const result = resolveAccountMapping("paypay", null);
    expect(result).not.toBeNull();
    expect(result!.actualAccountName).toBe("PayPay");
    expect(result!.actualAccountId).toBe("acc_paypay");
  });

  it("should map smbc source_name to SMBC Card account", () => {
    const result = resolveAccountMapping("smbc", null);
    expect(result).not.toBeNull();
    expect(result!.actualAccountName).toBe("SMBC Card");
  });

  it("should return null for unknown source_name", () => {
    const result = resolveAccountMapping("unknown_app", null);
    expect(result).toBeNull();
  });

  it("should use custom mappings when provided", () => {
    const custom = [
      { sourceName: "custom_app", platform: null, actualAccountId: "acc_custom", actualAccountName: "Custom" },
    ];
    const result = resolveAccountMapping("custom_app", null, custom);
    expect(result!.actualAccountName).toBe("Custom");
  });
});

describe("resolveCategoryMapping", () => {
  it("should map FamilyMart to Convenience Store", () => {
    const result = resolveCategoryMapping("FamilyMart");
    expect(result).not.toBeNull();
    expect(result!.category).toBe("Convenience Store");
  });

  it("should map Starbucks to Cafe", () => {
    const result = resolveCategoryMapping("Starbucks");
    expect(result).not.toBeNull();
    expect(result!.category).toBe("Cafe");
  });

  it("should return null for unknown merchant", () => {
    const result = resolveCategoryMapping("UnknownShop");
    expect(result).toBeNull();
  });

  it("should return null for null merchant", () => {
    const result = resolveCategoryMapping(null);
    expect(result).toBeNull();
  });

  it("should be case-insensitive", () => {
    const result = resolveCategoryMapping("starbucks");
    expect(result).not.toBeNull();
    expect(result!.category).toBe("Cafe");
  });
});

describe("default mappings", () => {
  it("should return default account mappings", () => {
    const mappings = getDefaultAccountMappings();
    expect(mappings.length).toBeGreaterThan(0);
  });

  it("should return default category mappings", () => {
    const mappings = getDefaultCategoryMappings();
    expect(mappings.length).toBeGreaterThan(0);
  });
});
