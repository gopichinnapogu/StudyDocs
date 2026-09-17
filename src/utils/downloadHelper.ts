import { StudyDoc } from '../types';
import { fetchCompleteFileDataUrlFromCloud } from './cloudStorage';

/**
 * Converts a base64 DataURL directly into a native binary Blob.
 */
function dataUrlToBlob(dataUrl: string, fallbackMime: string = 'application/octet-stream'): Blob {
  try {
    const parts = dataUrl.split(',');
    const match = parts[0].match(/:(.*?);/);
    const mime = match ? match[1] : fallbackMime;
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (err) {
    console.error('Failed to parse dataUrl into Blob:', err);
    throw err;
  }
}

/**
 * Ensures the downloaded file retains its exact original file name and extension
 * (e.g. "Biology_Lecture.pptx" or "Machine_Learning.pdf").
 */
function getExactDownloadFileName(doc: StudyDoc): string {
  if (doc.fileName && doc.fileName.trim()) {
    return doc.fileName;
  }

  const cleanTitle = doc.title.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim().replace(/\s+/g, '_');
  let ext = doc.format.toLowerCase();
  if (ext === 'ppt') ext = 'pptx'; // default modern extension
  return `${cleanTitle || 'document'}.${ext}`;
}

export async function triggerDocumentDownload(doc: StudyDoc): Promise<void> {
  const targetFileName = getExactDownloadFileName(doc);

  // 1. If backend fileDownloadUrl is available and alive (same server)
  if (doc.fileDownloadUrl) {
    try {
      const res = await fetch(doc.fileDownloadUrl);
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = targetFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        return;
      }
    } catch (e) {
      console.warn('Server download endpoint unreachable, checking cloud binary storage:', e);
    }
  }

  // 2. Fetch binary dataUrl (from inline doc or reassembled cloud Firestore chunks)
  let dataUrl = doc.fileDataUrl;
  if (!dataUrl && (doc.hasChunks || !doc.fileDownloadUrl)) {
    dataUrl = (await fetchCompleteFileDataUrlFromCloud(doc)) || undefined;
  }

  // 3. Download the exact binary file
  if (dataUrl && dataUrl.startsWith('data:')) {
    try {
      const blob = dataUrlToBlob(dataUrl, doc.mimeType);
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = targetFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      return;
    } catch (err) {
      console.warn('Blob download error, falling back to direct DataURL anchor:', err);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = targetFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
  }

  // 4. In case a user opened a placeholder item before binary was synced
  alert(`The document "${targetFileName}" is still synchronizing to your device. Please try again in a few seconds.`);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function detectFormatFromFilename(fileName: string): 'PPT' | 'PDF' | 'DOCX' | 'TXT' | 'OTHER' {
  const ext = fileName.split('.').pop()?.toUpperCase();
  if (ext === 'PPT' || ext === 'PPTX') return 'PPT';
  if (ext === 'PDF') return 'PDF';
  if (ext === 'DOC' || ext === 'DOCX') return 'DOCX';
  if (ext === 'TXT' || ext === 'MD') return 'TXT';
  return 'OTHER';
}
