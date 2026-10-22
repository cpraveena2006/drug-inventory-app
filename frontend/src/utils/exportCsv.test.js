import { describe, expect, it } from "vitest";
import { toCsv } from "./exportCsv";

describe("toCsv", () => {
  it("escapes delimiters and quotes and neutralizes spreadsheet formulas", () => {
    const csv = toCsv([
      { label: "Name", value: (row) => row.name },
      { label: "Notes", value: (row) => row.notes },
    ], [{ name: "=HYPERLINK(\"https://example.test\")", notes: 'Use, "carefully"' }]);

    expect(csv).toBe('"Name","Notes"\r\n"\'=HYPERLINK(""https://example.test"")","Use, ""carefully"""');
  });

  it("writes empty values as empty quoted cells", () => {
    expect(toCsv([{ label: "Stock", value: (row) => row.stock }], [{ stock: null }]))
      .toBe('"Stock"\r\n""');
  });
});
