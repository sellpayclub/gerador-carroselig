import JSZip from "jszip";
import { saveAs } from "file-saver";

export interface DownloadItem {
  filename: string;
  dataUrl: string; // PNG data URL
}

export async function downloadAllAsZip(items: DownloadItem[]): Promise<void> {
  if (items.length === 0) return;
  const zip = new JSZip();
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");

  for (const item of items) {
    const base64 = item.dataUrl.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
    zip.file(item.filename, base64, { base64: true });
  }

  const blob = await zip.generateAsync({ type: "blob" });
  saveAs(blob, `carrossel-${stamp}.zip`);
}

export function downloadSingle(dataUrl: string, filename: string): void {
  saveAs(dataUrl, filename);
}
