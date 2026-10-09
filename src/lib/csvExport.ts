export function csvRow(values: Array<string | number | boolean | null | undefined>): string {
  return values.map(value => {
    const text = String(value ?? '');
    const safe = /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replace(/"/g, '""')}"`;
  }).join(',');
}

export function downloadCsv(rows: Array<Array<string | number | boolean | null | undefined>>, filename: string): void {
  const blob = new Blob(['\uFEFF', rows.map(csvRow).join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
