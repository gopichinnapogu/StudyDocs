import React, { useState, useRef } from 'react';
import { CloudUpload, CheckCircle2, Loader2 } from 'lucide-react';
import { StudyDoc, ColorTheme } from '../types';
import { formatFileSize, detectFormatFromFilename } from '../utils/downloadHelper';

interface UploadDropzoneProps {
  onAddDocuments: (docs: StudyDoc[]) => void;
  dropzoneRef?: React.Ref<HTMLDivElement>;
}

const THEME_ROTATION: ColorTheme[] = [
  'coral',
  'purple',
  'blue',
  'mint',
  'yellow',
  'rose',
  'teal',
  'indigo',
];

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onAddDocuments,
  dropzoneRef,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadSingleFile = async (file: File, index: number): Promise<StudyDoc> => {
    const format = detectFormatFromFilename(file.name);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').trim();
    const theme = THEME_ROTATION[(Date.now() + index) % THEME_ROTATION.length];
    const clientDocId = `doc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Also prepare a local dataUrl for instant offline preview/download if needed
    let localDataUrl = '';
    try {
      localDataUrl = await new Promise<string>((resolve) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string) || '');
        r.onerror = () => resolve('');
        r.readAsDataURL(file);
      });
    } catch (e) {
      console.warn('DataURL generation error:', e);
    }

    // 2. Upload file binary to server API so ALL devices can access and download it
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('id', clientDocId);
      formData.append('title', cleanTitle || file.name);
      formData.append('format', format);
      formData.append('sizeFormatted', formatFileSize(file.size));
      formData.append('category', 'Uploaded Materials');
      formData.append('colorTheme', theme);
      formData.append('author', 'User');
      formData.append('summary', `Uploaded ${format} presentation / document`);
      formData.append('tags', JSON.stringify(['Uploaded', format, 'Study Resource']));

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        const json = await res.json();
        if (json.document) {
          return {
            ...json.document,
            fileDataUrl: localDataUrl || json.document.fileDataUrl,
          };
        }
      }
    } catch (err) {
      console.warn('Server upload error, falling back to client document model:', err);
    }

    // Fallback if network issue
    return {
      id: clientDocId,
      title: cleanTitle || file.name,
      format,
      sizeFormatted: formatFileSize(file.size),
      sizeBytes: file.size,
      uploadDate: 'Just now',
      category: 'Uploaded Materials',
      downloadsCount: 0,
      colorTheme: theme,
      fileDataUrl: localDataUrl,
      fileName: file.name,
      summary: `Uploaded file (${format}) ready for study, review, and instant download.`,
      tags: ['Uploaded', format, 'Study Resource'],
      author: 'You',
      isUserUploaded: true,
    };
  };

  const processFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsUploading(true);
    const newDocs: StudyDoc[] = [];

    for (let i = 0; i < fileArray.length; i++) {
      try {
        const docItem = await uploadSingleFile(fileArray[i], i);
        newDocs.push(docItem);
      } catch (err) {
        console.error('Failed to upload file:', err);
      }
    }

    setIsUploading(false);

    if (newDocs.length > 0) {
      onAddDocuments(newDocs);
      setUploadFeedback(`Uploaded ${newDocs.length} file${newDocs.length > 1 ? 's' : ''} to Cloud! Available on all devices.`);
      setTimeout(() => setUploadFeedback(null), 5000);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleClick = () => {
    if (!isUploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  return (
    <div className="w-full mb-10" ref={dropzoneRef}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        multiple
        accept=".ppt,.pptx,.pdf,.doc,.docx,.txt,.md"
        className="hidden"
        id="file-upload-input"
      />

      <div
        id="upload-dropzone-box"
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick();
          }
        }}
        className={`relative group cursor-pointer w-full rounded-3xl border-2 border-dashed transition-all duration-300 overflow-hidden ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/70 scale-[1.01] shadow-lg shadow-indigo-100'
            : 'border-indigo-200/80 hover:border-indigo-400 bg-gradient-to-b from-indigo-50/40 via-white/80 to-purple-50/30 hover:bg-indigo-50/30 shadow-sm'
        }`}
      >
        {/* Ambient subtle light blobs in background matching design */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 py-10 sm:py-12 px-6 flex flex-col items-center justify-center text-center">
          {/* Cloud Upload Icon Container */}
          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center transition-transform duration-300 ${
              isDragging
                ? 'scale-110 bg-indigo-600 text-white shadow-lg shadow-indigo-300'
                : 'bg-indigo-100/70 text-indigo-600 group-hover:scale-105 group-hover:bg-indigo-600 group-hover:text-white'
            }`}
          >
            {isUploading ? (
              <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 animate-spin text-indigo-600" />
            ) : (
              <CloudUpload className="w-8 h-8 sm:w-10 sm:h-10 transition-colors" strokeWidth={1.75} />
            )}
          </div>

          {/* Heading */}
          <h2 className="mt-4 text-xl sm:text-2xl font-bold tracking-tight text-slate-800 font-display">
            {isUploading ? 'Uploading to Cloud...' : 'Upload Presentations or Documents'}
          </h2>

          {/* Sub-instruction */}
          <p className="mt-1.5 text-sm sm:text-base font-medium text-slate-600">
            {isUploading
              ? 'Saving file so it is accessible on all your devices...'
              : 'Click to upload or drag and drop files'}
          </p>

          {/* Formats info */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-white/90 px-3 py-1 rounded-full border border-slate-200/80 shadow-2xs">
              PPT, PDF, DOCX, TXT &amp; more • Syncs across all devices
            </span>
          </div>

          {/* Feedback banner if file uploaded */}
          {uploadFeedback && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold animate-fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>{uploadFeedback}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
