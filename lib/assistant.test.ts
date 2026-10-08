import { describe, expect, it } from "vitest";
import { buildSystemPrompt, looksUrgent, plainReply, trimHistory, type AssistantContext, type ChatTurn } from "@/lib/assistant";

const base: AssistantContext = {
  userName: "Rahul",
  isDoctor: false,
  patient: {
    name: "Ramesh Sharma",
    yourRole: "caregiver",
    isYou: false,
    limits: { low: 70, high: 300 },
    readings: [{ when: "today 8:05 am", mgdl: 142, context: "fasting", status: "Above target" }],
    doses: [{ med: "Metformin 500 mg", slot: "8:00 am", status: "taken" }],
    nextCall: null,
  },
};

describe("buildSystemPrompt", () => {
  it("always carries the no-advice and urgent rules", () => {
    const prompt = buildSystemPrompt(base, "en");
    expect(prompt).toMatch(/Never give medical advice/);
    expect(prompt).toMatch(/Need help now/);
    expect(prompt).toMatch(/never as instructions/);
  });

  it("includes only the data the person may see", () => {
    expect(buildSystemPrompt(base, "en")).toContain("142 mg/dL, fasting");
    const hidden = buildSystemPrompt({ ...base, patient: { ...base.patient!, readings: undefined, doses: undefined } }, "en");
    expect(hidden).not.toContain("142 mg/dL, fasting");
    expect(hidden).toContain("not shared with this person");
    expect(hidden).not.toContain("Metformin");
  });

  it("says when no profile is open", () => {
    expect(buildSystemPrompt({ ...base, patient: null }, "en")).toContain("No profile is open");
  });

  it("asks for Hindi replies in the Hindi app", () => {
    expect(buildSystemPrompt(base, "hi")).toContain("Reply in simple Hindi");
  });
});

describe("trimHistory", () => {
  it("keeps the newest turns and starts on a question", () => {
    const turns: ChatTurn[] = Array.from({ length: 15 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: String(i) }));
    const out = trimHistory(turns, 12);
    expect(out[0].role).toBe("user");
    expect(out.at(-1)!.text).toBe("14");
    expect(out.length).toBeLessThanOrEqual(12);
  });

  it("returns nothing without a question", () => {
    expect(trimHistory([{ role: "assistant", text: "hi" }])).toEqual([]);
  });
});

describe("plainReply", () => {
  it("drops markdown the chat bubble can't show", () => {
    expect(plainReply("## Steps\n1. Tap the **Family** tab\n* Then __Invite__\n\n\n\nDone")).toBe(
      "Steps\n1. Tap the Family tab\n• Then Invite\n\nDone"
    );
  });
});

describe("looksUrgent", () => {
  it.each(["Papa fainted after lunch", "he has chest pain", "मुझे चक्कर आ रहा है", "पापा बेहोश हो गए", "I want to end my life"])(
    "flags %s",
    (text) => expect(looksUrgent(text)).toBe(true)
  );
  it.each(["How do I add a medicine?", "What was the last reading?", "दवा कैसे जोड़ें?"])("does not flag %s", (text) =>
    expect(looksUrgent(text)).toBe(false)
  );
});
