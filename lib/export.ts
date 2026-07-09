/** Escape a value for CSV (RFC-style). */
function escapeCell(value: string | number | null | undefined): string {
  const str = value == null ? "" : String(value);
  if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function toCsv(
  headers: string[],
  rows: (string | number | null | undefined)[][]
): string {
  const lines = [
    headers.map(escapeCell).join(","),
    ...rows.map((row) => row.map(escapeCell).join(",")),
  ];
  return lines.join("\r\n");
}

export function csvDownloadResponse(
  filename: string,
  csv: string
): Response {
  return new Response("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function jsonDownloadResponse(
  filename: string,
  data: unknown
): Response {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

/** CSV tuned for Excel (UTF-8 BOM + .csv filename). */
export function excelCsvDownloadResponse(
  filename: string,
  csv: string
): Response {
  const excelName = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  return csvDownloadResponse(excelName, csv);
}
