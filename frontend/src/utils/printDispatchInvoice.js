function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

export function printDispatchInvoice(order) {
  const printWindow = window.open("", "_blank");
  if (!printWindow) throw new Error("The invoice window was blocked. Allow pop-ups and try again.");
  printWindow.opener = null;

  const orderNumber = String(order._id).slice(-7).toUpperCase();
  const rows = (order.items || []).map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unitPrice) || 0;
    return `<tr><td>${escapeHtml(item.drug?.name || "Medicine")}</td><td>${quantity}</td><td>₹${unitPrice.toFixed(2)}</td><td>₹${(quantity * unitPrice).toFixed(2)}</td></tr>`;
  }).join("");
  const createdAt = order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN") : "—";

  printWindow.document.write(`<!doctype html>
    <html><head><meta charset="utf-8"><title>Dispatch invoice ${orderNumber}</title>
    <style>
      body{font:14px Arial,sans-serif;color:#172b36;margin:40px}
      header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #0f766e;padding-bottom:18px}
      h1{font-size:24px;margin:0 0 8px}p{margin:4px 0;color:#53656d}
      table{border-collapse:collapse;width:100%;margin:28px 0}
      th,td{text-align:left;padding:11px;border-bottom:1px solid #dce5e8}
      th{background:#f1f6f6}.total{text-align:right;font-size:18px;font-weight:bold}
      @media print{body{margin:15mm}}
    </style></head><body>
    <header><div><h1>Dispatch invoice</h1><p>MediStock · Pharmaceutical Inventory Management</p></div>
    <div><p><strong>Invoice:</strong> #${escapeHtml(orderNumber)}</p><p><strong>Date:</strong> ${escapeHtml(createdAt)}</p></div></header>
    <p><strong>Buyer:</strong> ${escapeHtml(order.buyerName || "—")}</p>
    <table><thead><tr><th>Medicine</th><th>Quantity</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="total">Total: ₹${(Number(order.totalAmount) || 0).toFixed(2)}</p>
    ${order.notes ? `<p><strong>Notes:</strong> ${escapeHtml(order.notes)}</p>` : ""}
    </body></html>`);
  printWindow.document.close();
  window.setTimeout(() => printWindow.print(), 250);
}
