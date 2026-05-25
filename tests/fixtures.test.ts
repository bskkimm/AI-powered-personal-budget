import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const fixturesDir = join(import.meta.dirname, "..", "fixtures");

function loadFixture(name: string): unknown {
  const raw = readFileSync(join(fixturesDir, name), "utf-8");
  return JSON.parse(raw);
}

describe("Fixtures", () => {
  it("paypay-familymart-jpy should have expected shape", () => {
    const f = loadFixture("paypay-familymart-jpy.json") as Record<string, unknown>;
    expect(f.source_channel).toBe("phone_notification");
    expect(f.source_name).toBe("paypay");
    expect(f.body).toBe("ファミリーマートで680円を支払いました");
  });

  it("korean-unknown-krw should have expected shape", () => {
    const f = loadFixture("korean-unknown-krw.json") as Record<string, unknown>;
    expect(f.source_channel).toBe("phone_notification");
    expect(f.body).toBe("결제가 완료되었습니다. 12,000원");
  });

  it("smbc-starbucks-jpy should have expected shape", () => {
    const f = loadFixture("smbc-starbucks-jpy.json") as Record<string, unknown>;
    expect(f.source_channel).toBe("email");
    expect(f.source_name).toBe("smbc");
    expect(f.title).toBe("ご利用通知");
  });

  it("manual-cu-cash-krw should have expected shape", () => {
    const f = loadFixture("manual-cu-cash-krw.json") as Record<string, unknown>;
    expect(f.source_channel).toBe("manual");
    expect(typeof f.body).toBe("object");
    const body = f.body as Record<string, unknown>;
    expect(body.amount).toBe(7000);
    expect(body.currency).toBe("KRW");
  });
});
