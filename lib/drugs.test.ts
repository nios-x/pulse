import { describe, expect, it } from "vitest";
import { checkInteractions, findBrand, genericAlternative, lookupGenerics, searchDrugs } from "./drugs";

describe("drug reference", () => {
  it("maps brands and generics", () => {
    expect(lookupGenerics("Glycomet 500")).toEqual(["metformin"]);
    expect(lookupGenerics("Thyronorm", "Levothyroxine")).toEqual(["levothyroxine"]);
    expect(lookupGenerics("Combiflam").sort()).toEqual(["ibuprofen", "paracetamol"]);
    expect(findBrand("Telma-AM 40")?.brand).toBe("Telma-AM");
    expect(findBrand("Pantocid")?.brand).toBe("Pantocid");
    expect(lookupGenerics("Unknown herbal syrup")).toEqual([]);
  });

  it("finds interactions, most serious first", () => {
    const { interactions } = checkInteractions([
      { id: "1", name: "Thyronorm 50" },
      { id: "2", name: "Shelcal 500" },
      { id: "3", name: "Ecosprin 75" },
      { id: "4", name: "Brufen 400" },
    ]);
    expect(interactions.map((i) => i.severity)).toEqual(["major", "moderate"]);
    expect(interactions[0].effect).toMatch(/bleeding/);
    expect(interactions[1].advice).toMatch(/4 hours/);
  });

  it("finds same-ingredient duplicates", () => {
    const { duplicates } = checkInteractions([
      { id: "1", name: "Dolo 650" },
      { id: "2", name: "Combiflam" },
    ]);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].generic).toBe("paracetamol");
  });

  it("suggests generic alternatives with savings", () => {
    const alt = genericAlternative("Telma 40", 1);
    expect(alt?.genericName).toBe("Telmisartan");
    expect(alt?.savingPercent).toBeGreaterThan(50);
    expect(alt?.monthlySaving).toBe(Math.round(((110 - 14) / 10) * 30));
    expect(genericAlternative("Something else")).toBeNull();
  });

  it("searches by brand or generic", () => {
    expect(searchDrugs("met").map((d) => d.brand)).toContain("Glycomet");
    expect(searchDrugs("a")).toEqual([]);
  });
});
