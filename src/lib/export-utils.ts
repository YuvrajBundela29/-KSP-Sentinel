// KSP Sentinel AI — Export Utilities

export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map((row) =>
      headers
        .map((h) => {
          const val = String(row[h] ?? "");
          return val.includes(",") || val.includes('"') ? `"${val.replace(/"/g, '""')}"` : val;
        })
        .join(",")
    ),
  ];
  downloadFile(csvRows.join("\n"), `${filename}.csv`, "text/csv");
}

export function exportToJSON(data: unknown[], filename: string) {
  downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, "application/json");
}

export function exportToPrint(elementId: string) {
  const el = document.getElementById(elementId);
  if (!el) return;
  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(`
    <html><head><title>KSP Sentinel AI — Print</title>
    <style>
      body { font-family: -apple-system, sans-serif; padding: 20px; color: #1a1a2e; }
      table { width: 100%; border-collapse: collapse; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
      th { background: #f5f5f5; font-weight: 600; }
      tr:nth-child(even) { background: #fafafa; }
      h2 { margin-bottom: 10px; }
      .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #1a2035; padding-bottom: 10px; margin-bottom: 20px; }
    </style></head><body>
    <div class="header"><h2>KSP Sentinel AI</h2><span>${new Date().toLocaleString("en-IN")}</span></div>
    ${el.innerHTML}
    </body></html>
  `);
  win.document.close();
  win.print();
}

export function exportToExcel(data: Record<string, unknown>[], filename: string) {
  // Basic XLSX generation via CSV with BOM for Excel compatibility
  if (!data.length) return;
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join("\t"),
    ...data.map((row) =>
      headers.map((h) => String(row[h] ?? "")).join("\t")
    ),
  ];
  const bom = "\uFEFF";
  downloadFile(bom + csvRows.join("\n"), `${filename}.xls`, "application/vnd.ms-excel");
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}