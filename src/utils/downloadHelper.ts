import { StudyDoc } from '../types';

export function triggerDocumentDownload(doc: StudyDoc) {
  if (doc.fileDataUrl) {
    const a = document.createElement('a');
    a.href = doc.fileDataUrl;
    a.download = doc.fileName || `${doc.title.replace(/\s+/g, '_')}.${doc.format.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return;
  }

  // Generate an educational study packet for the sample document
  const content = `=================================================================
STUDYDOCS ACADEMIC REPOSITORY
Document: ${doc.title}
Format: ${doc.format} | Size: ${doc.sizeFormatted} | Category: ${doc.category}
Author: ${doc.author}
Published: ${doc.uploadDate}
=================================================================

OVERVIEW & ABSTRACT:
${doc.summary}

TOPICS & KEY CONCEPTS COVERED:
${doc.tags.map((t, idx) => `  ${idx + 1}. ${t}`).join('\n')}

CORE STUDY NOTES & SUMMARY:
1. Fundamental Definitions & Terminology
   - Standard academic guidelines and definitions pertinent to ${doc.title}.
   - Core theoretical principles, mathematical formulas, and practical algorithms.
   - Recommended reference bibliography and supplementary lecture materials.

2. Key Exam & Interview Takeaways
   - Frequent problem patterns and algorithmic solutions.
   - Conceptual questions and architectural diagrams.
   - Key terminology and diagnostic checklists.

=================================================================
Exported from StudyDocs (gopichinnapogu/StudyDocs)
Repository: https://github.com/gopichinnapogu/StudyDocs
All rights reserved. For educational use.
=================================================================
`;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_StudyGuide.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
