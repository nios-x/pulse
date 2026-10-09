import { describe, expect, it } from "vitest";
import { combineLevels, evaluateRedFlags, looksLikeDiagnosis } from "./rules";

const base = { flags: {}, ageYears: 45 };

describe("triage red-flag rules", () => {
  it("chest pain plus sweating is an emergency, before any AI", () => {
    const r = evaluateRedFlags({ ...base, symptoms: "Chest pain and sweating since 20 minutes" });
    expect(r.level).toBe("emergency");
    expect(r.final).toBe(true);
    expect(r.redFlags.map((f) => f.code)).toContain("cardiac");
  });

  it("works from the yes/no toggles even if the text says little", () => {
    const r = evaluateRedFlags({ ...base, symptoms: "not feeling well", flags: { chestPain: true, sweating: true } });
    expect(r.level).toBe("emergency");
  });

  it("understands Hindi and Hinglish", () => {
    expect(evaluateRedFlags({ ...base, symptoms: "सीने में दर्द और पसीना" }).level).toBe("emergency");
    expect(evaluateRedFlags({ ...base, symptoms: "seene mein dard ho raha hai, pasina aa raha" }).level).toBe("emergency");
  });

  it("chest pain alone is urgent, not self care", () => {
    expect(evaluateRedFlags({ ...base, symptoms: "mild chest pain" }).level).toBe("urgent");
  });

  it("catches stroke signs, self-harm and low oxygen", () => {
    expect(evaluateRedFlags({ ...base, symptoms: "face drooping and slurred speech" }).level).toBe("emergency");
    const sh = evaluateRedFlags({ ...base, symptoms: "I want to end my life" });
    expect(sh.level).toBe("emergency");
    expect(sh.redFlags[0].reason).toMatch(/14416/);
    expect(evaluateRedFlags({ ...base, symptoms: "tired", spo2: 89 }).level).toBe("emergency");
  });

  it("raises fever by age and duration", () => {
    expect(evaluateRedFlags({ ...base, symptoms: "fever", ageYears: 0 }).level).toBe("urgent");
    expect(evaluateRedFlags({ ...base, symptoms: "fever", durationDays: 4 }).level).toBe("doctor");
    expect(evaluateRedFlags({ ...base, symptoms: "fever and stiff neck" }).level).toBe("emergency");
    expect(evaluateRedFlags({ ...base, symptoms: "fever", temperatureF: 103.5 }).level).toBe("urgent");
  });

  it("mild symptoms stay self care", () => {
    const r = evaluateRedFlags({ ...base, symptoms: "runny nose and sneezing since yesterday", severity: 2, durationDays: 1 });
    expect(r.level).toBe("self_care");
    expect(r.final).toBe(false);
  });

  it("the AI can raise but never lower the level", () => {
    expect(combineLevels("urgent", "self_care")).toBe("urgent");
    expect(combineLevels("self_care", "doctor")).toBe("doctor");
    expect(combineLevels("doctor", null)).toBe("doctor");
  });

  it("spots diagnosis-like AI text", () => {
    expect(looksLikeDiagnosis("You have dengue.")).toBe(true);
    expect(looksLikeDiagnosis("Take 500 mg paracetamol")).toBe(true);
    expect(looksLikeDiagnosis("Rest and drink fluids. See a doctor if fever lasts.")).toBe(false);
  });
});
