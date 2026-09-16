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

export function subscribeToDocuments(onUpdate: (docs: StudyDoc[]) => void): () => void {
  try {
    const q = query(collection(db, COLLECTION_NAME), orderBy('createdAtTimestamp', 'desc'));
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
            summary: data.summary || '',
            tags: data.tags || [],
            author: data.author || 'User',
            isUserUploaded: true,
          });
        });
        onUpdate(docs);
      },
      (error) => {
        console.error('Error in Firestore documents subscription:', error);
        // Fallback: try querying without order if index is building
        getDocs(collection(db, COLLECTION_NAME)).then((snap) => {
          const fallbackDocs: StudyDoc[] = [];
          snap.forEach((s) => {
            const data = s.data();
            fallbackDocs.push({
              id: s.id,
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
              summary: data.summary || '',
              tags: data.tags || [],
              author: data.author || 'User',
              isUserUploaded: true,
            });
          });
          onUpdate(fallbackDocs);
        }).catch((e) => console.error('Fallback query failed:', e));
      }
    );
    return unsubscribe;
  } catch (err) {
    console.error('Failed to initialize document listener:', err);
    return () => {};
  }
}

export async function saveDocumentToCloud(docItem: StudyDoc): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, docItem.id);
  const payload: Record<string, any> = {
    id: docItem.id,
    title: docItem.title,
    format: docItem.format,
    sizeFormatted: docItem.sizeFormatted,
    sizeBytes: docItem.sizeBytes,
    uploadDate: docItem.uploadDate,
    category: docItem.category,
    downloadsCount: docItem.downloadsCount,
    colorTheme: docItem.colorTheme,
    summary: docItem.summary,
    tags: docItem.tags,
    author: docItem.author,
    isUserUploaded: true,
    createdAtTimestamp: serverTimestamp(),
  };

  if (docItem.fileDataUrl) {
    payload.fileDataUrl = docItem.fileDataUrl;
  }
  if (docItem.fileName) {
    payload.fileName = docItem.fileName;
  }

  await setDoc(docRef, payload);
}

export async function deleteDocumentFromCloud(id: string): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

export async function incrementDownloadCountInCloud(id: string, currentCount: number): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    downloadsCount: (currentCount || 0) + 1,
  }).catch((err) => {
    console.warn('Could not increment download count in cloud:', err);
  });
}
