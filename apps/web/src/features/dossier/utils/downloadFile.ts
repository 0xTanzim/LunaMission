/**
 * Triggers client-side download of a text or telemetry artifact.
 * Safely handles environments where document or window may not be present.
 */
export function downloadFile(filename: string, content: string, mime: string): void {
  const doc = typeof globalThis !== 'undefined' ? (globalThis as any).document : undefined;
  if (!doc) {
    return;
  }
  const urlApi = typeof globalThis !== 'undefined' ? (globalThis as any).URL : undefined;
  const blob = new Blob([content], { type: mime });
  const objectUrl = urlApi ? urlApi.createObjectURL(blob) : '';
  const a = doc.createElement('a');
  a.href = objectUrl;
  a.download = filename;
  doc.body.appendChild(a);
  a.click();
  doc.body.removeChild(a);
  if (urlApi && objectUrl) {
    urlApi.revokeObjectURL(objectUrl);
  }
}
