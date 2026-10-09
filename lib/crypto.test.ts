import { describe, expect, it } from "vitest";
import { decrypt, encrypt, inviteCode } from "./crypto";

describe("record encryption", () => {
  it("round-trips and never stores plain text", () => {
    const plain = Buffer.from("HbA1c 7.2% - Suresh Mehta");
    const blob = encrypt(plain);
    expect(blob.includes(plain)).toBe(false);
    expect(decrypt(blob).toString()).toBe(plain.toString());
  });

  it("rejects tampered data", () => {
    const blob = encrypt(Buffer.from("report"));
    blob[blob.length - 1] ^= 1;
    expect(() => decrypt(blob)).toThrow();
  });

  it("makes readable invite codes", () => {
    expect(inviteCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
});
