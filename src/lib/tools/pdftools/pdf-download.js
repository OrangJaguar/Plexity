/**
 * @param {Uint8Array} data
 * @param {string} filename
 */
export function downloadPdf(data, filename) {
  const blob = new Blob([data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * @param {{ name: string, data: Uint8Array }[]} files
 */
export async function downloadMultiplePdfs(files) {
  for (const file of files) {
    downloadPdf(file.data, file.name);
    await new Promise((r) => setTimeout(r, 300));
  }
}

/**
 * @param {string} baseName
 * @param {string} [suffix]
 */
export function outputFilename(baseName, suffix = 'edited') {
  const stem = baseName.replace(/\.pdf$/i, '');
  return `${stem}-${suffix}.pdf`;
}
