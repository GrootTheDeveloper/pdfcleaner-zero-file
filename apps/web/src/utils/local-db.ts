export interface HistoryEntry {
  id: string;
  fileName: string;
  fileSize: number;
  pagesProcessed: number;
  timestamp: number;
  pdfBlob: Blob;
  zipBlob?: Blob;
}

const DB_NAME = 'pdfcleaner_local_db';
const DB_VERSION = 1;
const STORE_NAME = 'history';
const MAX_HISTORY_ITEMS = 5;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function saveToHistory(entry: Omit<HistoryEntry, 'id' | 'timestamp'>): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Prune history first if it exceeds limit
    const allKeysRequest = store.getAllKeys();
    await new Promise<void>((resolve, reject) => {
      allKeysRequest.onsuccess = () => {
        const keys = allKeysRequest.result;
        if (keys.length >= MAX_HISTORY_ITEMS) {
          const allEntriesRequest = store.getAll();
          allEntriesRequest.onsuccess = () => {
            const entries = allEntriesRequest.result as HistoryEntry[];
            entries.sort((a, b) => a.timestamp - b.timestamp);
            const toDelete = entries.length - MAX_HISTORY_ITEMS + 1;
            for (let i = 0; i < toDelete; i++) {
              store.delete(entries[i].id);
            }
            resolve();
          };
          allEntriesRequest.onerror = () => reject(allEntriesRequest.error);
        } else {
          resolve();
        }
      };
      allKeysRequest.onerror = () => reject(allKeysRequest.error);
    });

    // Add new entry
    const newEntry: HistoryEntry = {
      ...entry,
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(),
      timestamp: Date.now(),
    };

    store.put(newEntry);

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save to local IndexedDB history', err);
  }
}

export async function getHistory(): Promise<HistoryEntry[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const results = request.result as HistoryEntry[];
        results.sort((a, b) => b.timestamp - a.timestamp);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error('Failed to fetch local history', err);
    return [];
  }
}

export async function clearLocalHistory(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to clear local history', err);
  }
}
