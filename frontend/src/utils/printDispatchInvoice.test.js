import { afterEach, describe, expect, it, vi } from "vitest";
import { printDispatchInvoice } from "./printDispatchInvoice";

describe("printDispatchInvoice", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("prints an escaped invoice with calculated line totals", () => {
    const printWindow = {
      document: { write: vi.fn(), close: vi.fn() },
      print: vi.fn(),
      opener: window,
    };
    vi.spyOn(window, "open").mockReturnValue(printWindow);
    vi.useFakeTimers();

    printDispatchInvoice({
      _id: "123456789",
      buyerName: "<Clinic>",
      createdAt: "2026-10-21T00:00:00.000Z",
      totalAmount: 12,
      items: [{ drug: { name: "Medicine & Co" }, quantity: 2, unitPrice: 6 }],
    });

    const html = printWindow.document.write.mock.calls[0][0];
    expect(html).toContain("&lt;Clinic&gt;");
    expect(html).toContain("Medicine &amp; Co");
    expect(html).toContain("₹12.00");
    expect(printWindow.opener).toBeNull();
    expect(printWindow.document.close).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(250);
    expect(printWindow.print).toHaveBeenCalledOnce();
  });

  it("reports when the browser blocks the invoice window", () => {
    vi.spyOn(window, "open").mockReturnValue(null);
    expect(() => printDispatchInvoice({ _id: "123" })).toThrow("The invoice window was blocked");
  });
});
