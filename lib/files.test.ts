import { describe, expect, it } from "vitest";
import { detectFileType } from "./files";

describe("upload sniffing", () => {
  it("recognises real files and rejects disguised ones", () => {
    expect(detectFileType(Buffer.from("%PDF-1.7 hello world"))).toBe("application/pdf");
    expect(detectFileType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]))).toBe("image/jpeg");
    expect(detectFileType(Buffer.from("<svg onload=alert(1)>.........."))).toBeNull();
    expect(detectFileType(Buffer.from("MZ executable pretending"))).toBeNull();
  });
});
