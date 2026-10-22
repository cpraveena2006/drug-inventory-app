function escapeCsvValue(value) {
  const text = String(value ?? "").replace(/[\r\n]+/g, " ").trim();
  const safeText = /^[\t ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export function toCsv(columns, rows) {
  return [
    columns.map(({ label }) => escapeCsvValue(label)).join(","),
    ...rows.map((row) => columns.map(({ value }) => escapeCsvValue(value(row))).join(",")),
  ].join("\r\n");
}

export function downloadCsv(filename, columns, rows) {
  const csv = toCsv(columns, rows);
  const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
