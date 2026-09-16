import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import { db } from '../firebase';
import { StudyDoc } from '../types';

const COLLECTION_NAME = 'documents';

// Maximum size in bytes Firestore document allows is 1MB.
// Keep inline binary/dataUrl to 750KB to guarantee 100% successful save
const MAX_FIRESTORE_DATA_URL_BYTES = 750 * 1024;

export function subscribeToDocuments(onUpdate: (docs: StudyDoc[]) => void): () => void {
  try {
    // Listen to the Firestore collection in real-time
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

        console.log(`[Firestore] Received ${docs.length} documents in real-time`);
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

export async function saveDocumentToCloud(docItem: StudyDoc): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, docItem.id);
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
      updatedAt: serverTimestamp(),
    };

    if (docItem.fileName) {
      payload.fileName = docItem.fileName;
    }
    if (docItem.fileDownloadUrl) {
      payload.fileDownloadUrl = docItem.fileDownloadUrl;
    }

    // Only include fileDataUrl if it is within Firestore 1MB document limit
    if (docItem.fileDataUrl && docItem.fileDataUrl.length < MAX_FIRESTORE_DATA_URL_BYTES) {
      payload.fileDataUrl = docItem.fileDataUrl;
    }

    await setDoc(docRef, payload, { merge: true });
    console.log('[Firestore] Document saved successfully to cloud:', docItem.id);
  } catch (err) {
    console.error('[Firestore] Error saving document to cloud:', err);
    throw err;
  }
}

export async function deleteDocumentFromCloud(id: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
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
