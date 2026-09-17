export type DocumentFormat = 'PPT' | 'PDF' | 'DOCX' | 'TXT' | 'OTHER';

export type ColorTheme =
  | 'coral'
  | 'purple'
  | 'blue'
  | 'mint'
  | 'yellow'
  | 'rose'
  | 'teal'
  | 'indigo';

export interface StudyDoc {
  id: string;
  title: string;
  format: DocumentFormat;
  sizeFormatted: string;
  sizeBytes: number;
  uploadDate: string;
  category: string;
  downloadsCount: number;
  colorTheme: ColorTheme;
  fileDataUrl?: string;
  fileName?: string;
  fileDownloadUrl?: string;
  storedFileName?: string;
  mimeType?: string;
  hasChunks?: boolean;
  totalChunks?: number;
  summary: string;
  tags: string[];
  author: string;
  isUserUploaded?: boolean;
}

export type FilterCategory = 'ALL' | 'PPT' | 'PDF' | 'DOCX';
export type SortOption = 'latest' | 'popular' | 'title' | 'size';
