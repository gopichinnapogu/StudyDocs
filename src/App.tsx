import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Navbar } from './components/Navbar';
import { UploadDropzone } from './components/UploadDropzone';
import { DocumentCard } from './components/DocumentCard';
import { FilterBar } from './components/FilterBar';
import { INITIAL_DOCUMENTS } from './data/initialDocs';
import { StudyDoc, FilterCategory, SortOption } from './types';
import { FileSearch, ArrowUp, Cloud } from 'lucide-react';
import {
  subscribeToDocuments,
  saveDocumentToCloud,
  deleteDocumentFromCloud,
  incrementDownloadCountInCloud,
} from './utils/cloudStorage';
import {
  getAllStoredDocuments,
  saveDocument,
  deleteStoredDocument,
} from './utils/storage';

export function App() {
  const [documents, setDocuments] = useState<StudyDoc[]>(INITIAL_DOCUMENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<FilterCategory>('ALL');
  const [sortBy, setSortBy] = useState<SortOption>('latest');
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(true);
  const dropzoneRef = useRef<HTMLDivElement>(null);

  // Helper to fetch documents from server cloud database (guaranteed cross-device)
  const fetchServerDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      if (res.ok) {
        const data = await res.json();
        if (data.documents && Array.isArray(data.documents)) {
          return data.documents as StudyDoc[];
        }
      }
    } catch (e) {
      console.warn('Could not fetch from server /api/documents:', e);
    }
    return null;
  };

  // Synchronize on load and periodic polling fallback for instantaneous multi-device updates
  useEffect(() => {
    let isMounted = true;

    const loadAll = async () => {
      // 1. First fetch server documents (canonical cross-device store)
      const serverDocs = await fetchServerDocuments();
      if (isMounted && serverDocs) {
        setDocuments(serverDocs);
        setIsCloudSyncing(false);
        for (const doc of serverDocs) {
          saveDocument(doc);
        }
      } else {
        // Fallback to local IndexedDB if server is slow
        const local = await getAllStoredDocuments();
        if (isMounted && local && local.length > 0) {
          setDocuments(local);
          setIsCloudSyncing(false);
        }
      }
    };

    loadAll();

    // 2. Real-time Firebase Firestore listener as primary real-time stream
    const unsubscribeFirestore = subscribeToDocuments((cloudDocs) => {
      if (!isMounted) return;
      setIsCloudSyncing(false);
      if (cloudDocs && cloudDocs.length > 0) {
        setDocuments((prev) => {
          // Merge server URLs from previous or fetch
          const map = new Map<string, StudyDoc>();
          prev.forEach((p) => map.set(p.id, p));
          cloudDocs.forEach((c) => {
            const existing = map.get(c.id);
            map.set(c.id, {
              ...c,
              fileDownloadUrl: existing?.fileDownloadUrl || c.fileDownloadUrl,
            });
          });
          return Array.from(map.values());
        });
      }
    });

    // 3. Periodic polling interval (every 4 seconds) to ensure other devices get newly uploaded files without manual reload
    const pollInterval = setInterval(async () => {
      if (!isMounted) return;
      const polledDocs = await fetchServerDocuments();
      if (isMounted && polledDocs) {
        setDocuments(polledDocs);
      }
    }, 4000);

    return () => {
      isMounted = false;
      unsubscribeFirestore();
      clearInterval(pollInterval);
    };
  }, []);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleAddDocuments = async (newDocs: StudyDoc[]) => {
    setDocuments((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      const filteredNew = newDocs.filter((d) => !existingIds.has(d.id));
      return [...filteredNew, ...prev];
    });

    for (const doc of newDocs) {
      saveDocument(doc);
      // Sync metadata to Cloud Firestore
      saveDocumentToCloud(doc).catch((e) => console.warn('Firestore sync:', e));
    }
  };

  const handleDeleteDocument = async (id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    deleteStoredDocument(id);

    // 1. Delete from server filesystem & database
    try {
      await fetch(`/api/documents/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.warn('Server delete error:', e);
    }

    // 2. Delete from Cloud Firestore
    deleteDocumentFromCloud(id).catch((e) => console.warn('Firestore delete:', e));
  };

  const handleDownloadSuccess = async (id: string) => {
    const currentDoc = documents.find((d) => d.id === id);
    const count = currentDoc?.downloadsCount || 0;

    setDocuments((prev) => {
      const updated = prev.map((doc) =>
        doc.id === id ? { ...doc, downloadsCount: doc.downloadsCount + 1 } : doc
      );
      const found = updated.find((d) => d.id === id);
      if (found) {
        saveDocument(found);
      }
      return updated;
    });

    fetch(`/api/documents/${id}/increment-download`, { method: 'POST' }).catch(() => {});
    incrementDownloadCountInCloud(id, count).catch(() => {});
  };

  const handleScrollToUpload = () => {
    if (dropzoneRef.current) {
      dropzoneRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const pulseDiv = dropzoneRef.current.firstElementChild;
      if (pulseDiv) {
        pulseDiv.classList.add('ring-4', 'ring-indigo-300');
        setTimeout(() => {
          pulseDiv.classList.remove('ring-4', 'ring-indigo-300');
        }, 1500);
      }
    }
  };

  // Format count stats for filter chips
  const formatCounts = useMemo(() => {
    const counts: Record<FilterCategory, number> = {
      ALL: documents.length,
      PPT: 0,
      PDF: 0,
      DOCX: 0,
    };
    documents.forEach((d) => {
      if (d.format === 'PPT' || d.format === 'PDF' || d.format === 'DOCX') {
        counts[d.format]++;
      }
    });
    return counts;
  }, [documents]);

  // Filter and sort documents
  const filteredDocuments = useMemo(() => {
    let result = [...documents];

    // Filter by format
    if (selectedFormat !== 'ALL') {
      result = result.filter((doc) => doc.format === selectedFormat);
    }

    // Filter by search keyword
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((doc) => {
        return (
          doc.title.toLowerCase().includes(q) ||
          doc.format.toLowerCase().includes(q) ||
          (doc.author && doc.author.toLowerCase().includes(q))
        );
      });
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'popular') {
        return b.downloadsCount - a.downloadsCount;
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (sortBy === 'size') {
        return b.sizeBytes - a.sizeBytes;
      }
      return 0;
    });

    return result;
  }, [documents, selectedFormat, searchQuery, sortBy]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        totalDocs={documents.length}
        onUploadClick={handleScrollToUpload}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        {/* Upload Dropzone Hero Block */}
        <UploadDropzone
          onAddDocuments={handleAddDocuments}
          dropzoneRef={dropzoneRef}
        />

        {/* Filters and Sorting Bar */}
        {documents.length > 0 && (
          <FilterBar
            selectedFormat={selectedFormat}
            onSelectFormat={setSelectedFormat}
            formatCounts={formatCounts}
            sortBy={sortBy}
            onSortChange={setSortBy}
            totalResults={filteredDocuments.length}
          />
        )}

        {/* 4-Column Document Grid */}
        {filteredDocuments.length > 0 ? (
          <div
            id="documents-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          >
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                doc={doc}
                onDelete={handleDeleteDocument}
                onDownloadSuccess={handleDownloadSuccess}
              />
            ))}
          </div>
        ) : isCloudSyncing ? (
          <div className="text-center py-16 px-4 bg-white/60 rounded-3xl border border-dashed border-slate-200 my-6 flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center animate-pulse mb-3">
              <Cloud className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium text-slate-600">Connecting to cloud storage...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white/60 rounded-3xl border border-dashed border-slate-200 my-6">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-4">
              <FileSearch className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 font-display">
              No documents added yet
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              Drag &amp; drop or click the upload area above to add your study documents and presentations. They will sync automatically to all your devices!
            </p>
          </div>
        ) : (
          <div className="text-center py-16 px-4 bg-white/70 rounded-3xl border border-slate-200/80 my-6">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
              <FileSearch className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 font-display">
              No matching documents found
            </h3>
            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
              We couldn't find any resources matching &ldquo;{searchQuery}&rdquo;. Try adjusting your search keyword or clearing the format filter.
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFormat('ALL');
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition-colors"
              >
                Reset Filters
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Floating Back to Top Button */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-6 right-6 z-30 p-3 rounded-full bg-slate-900 text-white shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all hover:-translate-y-0.5"
          title="Back to top"
        >
          <ArrowUp className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export default App;
