import { describe, expect, it } from "vitest";
import { sign, verify } from "@/signaling/token";

const secret = "test-secret";
const exp = Math.floor(Date.now() / 1000) + 60;

describe("signaling tokens", () => {
  it("round-trips a signed payload", () => {
    expect(verify(sign({ userId: "u1", name: "Rahul", exp }, secret), secret)).toEqual({ userId: "u1", name: "Rahul", exp });
  });

  it("rejects a token signed with another secret (a forged userId)", () => {
    expect(verify(sign({ userId: "u1", exp }, "attacker"), secret)).toBeNull();
  });

  it("rejects a tampered payload", () => {
    const [, signature] = sign({ userId: "u1", exp }, secret).split(".");
    const forged = Buffer.from(JSON.stringify({ userId: "u2", exp })).toString("base64url");
    expect(verify(`${forged}.${signature}`, secret)).toBeNull();
  });

  it("rejects an expired token", () => {
    expect(verify(sign({ userId: "u1", exp: exp - 120 }, secret), secret)).toBeNull();
  });

  it("rejects junk", () => {
    expect(verify("not-a-token", secret)).toBeNull();
    expect(verify(42, secret)).toBeNull();
  });
});
