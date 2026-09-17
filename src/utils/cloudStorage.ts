import {
  collection,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import { StudyDoc } from '../types';

const COLLECTION_NAME = 'documents';
const CHUNKS_COLLECTION = 'fileChunks';

// Chunk size: ~500KB per chunk to be safely under Firestore's 1MB document limit
const CHUNK_SIZE = 500 * 1024;

export function subscribeToDocuments(onUpdate: (docs: StudyDoc[]) => void): () => void {
  try {
    const q = query(collection(db, COLLECTION_NAME));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs: StudyDoc[] = [];
        snapshot.forEach((snap) => {
          const data = snap.data();
          docs.push({
            id: snap.id,
            title: data.title || 'Untitled Document',
            format: data.format || 'OTHER',
            sizeFormatted: data.sizeFormatted || 'Unknown',
            sizeBytes: data.sizeBytes || 0,
            uploadDate: data.uploadDate || 'Recently',
            category: data.category || 'Uploaded Materials',
            downloadsCount: data.downloadsCount || 0,
            colorTheme: data.colorTheme || 'indigo',
            fileDataUrl: data.fileDataUrl || undefined,
            fileName: data.fileName || undefined,
            fileDownloadUrl: data.fileDownloadUrl || undefined,
            mimeType: data.mimeType || undefined,
            hasChunks: data.hasChunks || false,
            totalChunks: data.totalChunks || 0,
            summary: data.summary || '',
            tags: data.tags || [],
            author: data.author || 'User',
            isUserUploaded: true,
          });
        });

        // Sort latest first
        docs.sort((a, b) => {
          return (b.id || '').localeCompare(a.id || '');
        });

        onUpdate(docs);
      },
      (error) => {
        console.error('Firestore subscription error:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize document listener:', err);
    return () => {};
  }
}

/**
 * Saves a document and its entire binary file (base64 DataURL) to Firestore.
 * If the fileDataUrl exceeds 500KB, it automatically slices it into chunks
 * and stores them in fileChunks so any device (mobile, desktop, Netlify)
 * can download the genuine original binary (.ppt, .pptx, .pdf, .docx).
 */
export async function saveDocumentToCloud(docItem: StudyDoc): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, docItem.id);
    const fullDataUrl = docItem.fileDataUrl || '';

    let hasChunks = false;
    let totalChunks = 0;
    let inlineDataUrl: string | undefined = undefined;

    if (fullDataUrl) {
      if (fullDataUrl.length <= CHUNK_SIZE) {
        // Fits directly inline in the document
        inlineDataUrl = fullDataUrl;
      } else {
        // Needs chunking across fileChunks collection
        hasChunks = true;
        totalChunks = Math.ceil(fullDataUrl.length / CHUNK_SIZE);

        for (let i = 0; i < totalChunks; i++) {
          const chunkData = fullDataUrl.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          const chunkRef = doc(db, CHUNKS_COLLECTION, `${docItem.id}_chunk_${i}`);
          await setDoc(chunkRef, {
            docId: docItem.id,
            chunkIndex: i,
            data: chunkData,
            createdAt: serverTimestamp(),
          });
        }
      }
    }

    const payload: Record<string, any> = {
      id: docItem.id,
      title: docItem.title,
      format: docItem.format,
      sizeFormatted: docItem.sizeFormatted,
      sizeBytes: docItem.sizeBytes || 0,
      uploadDate: docItem.uploadDate || 'Recently',
      category: docItem.category || 'Uploaded Materials',
      downloadsCount: docItem.downloadsCount || 0,
      colorTheme: docItem.colorTheme || 'indigo',
      summary: docItem.summary || '',
      tags: docItem.tags || [],
      author: docItem.author || 'User',
      isUserUploaded: true,
      hasChunks,
      totalChunks,
      updatedAt: serverTimestamp(),
    };

    if (docItem.fileName) payload.fileName = docItem.fileName;
    if (docItem.mimeType) payload.mimeType = docItem.mimeType;
    if (docItem.fileDownloadUrl) payload.fileDownloadUrl = docItem.fileDownloadUrl;
    if (inlineDataUrl) payload.fileDataUrl = inlineDataUrl;

    await setDoc(docRef, payload, { merge: true });
    console.log('[Firestore] Document & binary saved to cloud successfully:', docItem.id);
  } catch (err) {
    console.error('[Firestore] Error saving document to cloud:', err);
    throw err;
  }
}

/**
 * Reassembles chunked binary DataURL from Firestore for a given document.
 */
export async function fetchCompleteFileDataUrlFromCloud(docItem: StudyDoc): Promise<string | null> {
  if (docItem.fileDataUrl) {
    return docItem.fileDataUrl;
  }

  if (docItem.hasChunks && docItem.totalChunks && docItem.totalChunks > 0) {
    try {
      const chunks: string[] = [];
      for (let i = 0; i < docItem.totalChunks; i++) {
        const chunkRef = doc(db, CHUNKS_COLLECTION, `${docItem.id}_chunk_${i}`);
        const snap = await getDoc(chunkRef);
        if (snap.exists()) {
          chunks.push(snap.data().data || '');
        } else {
          console.warn(`[Firestore] Missing chunk ${i} for ${docItem.id}`);
        }
      }
      if (chunks.length === docItem.totalChunks) {
        return chunks.join('');
      }
    } catch (err) {
      console.error('[Firestore] Error fetching file chunks:', err);
    }
  }

  return null;
}

export async function deleteDocumentFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();
      if (data.hasChunks && data.totalChunks) {
        // Delete all associated chunks
        for (let i = 0; i < data.totalChunks; i++) {
          const chunkRef = doc(db, CHUNKS_COLLECTION, `${id}_chunk_${i}`);
          deleteDoc(chunkRef).catch(() => {});
        }
      }
    }

    await deleteDoc(docRef);
    console.log('[Firestore] Document deleted from cloud:', id);
  } catch (err) {
    console.error('[Firestore] Error deleting document from cloud:', err);
  }
}

export async function incrementDownloadCountInCloud(id: string, currentCount: number): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, {
      downloadsCount: (currentCount || 0) + 1,
    });
  } catch (err) {
    console.warn('[Firestore] Could not increment count:', err);
  }
}
