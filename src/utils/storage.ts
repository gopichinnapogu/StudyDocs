import { StudyDoc } from '../types';

const DB_NAME = 'StudyDocsDB';
const DB_VERSION = 2;
const STORE_NAME = 'documents';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllStoredDocuments(): Promise<StudyDoc[]> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const result = (request.result as StudyDoc[]) || [];
        // Only keep documents uploaded by the user; remove any old predefined mock documents
        const userUploadedDocs = result.filter(
          (d) => d.isUserUploaded === true && !d.id.startsWith('doc-')
        );

        // If old predefined items were present in the store, purge them
        if (userUploadedDocs.length !== result.length) {
          store.clear();
          for (const doc of userUploadedDocs) {
            store.put(doc);
          }
        }

        resolve(userUploadedDocs);
      };

      request.onerror = () => {
        resolve([]);
      };
    });
  } catch (err) {
    console.warn('IndexedDB unavailable, defaulting to empty documents list:', err);
    return [];
  }
}

export async function saveDocument(doc: StudyDoc): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(doc);
  } catch (err) {
    console.error('Failed to save document to IndexedDB:', err);
  }
}

export async function deleteStoredDocument(id: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.delete(id);
  } catch (err) {
    console.error('Failed to delete document from IndexedDB:', err);
  }
}

export async function clearAllDocuments(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
  } catch (err) {
    console.error('Failed to clear documents from IndexedDB:', err);
  }
}
