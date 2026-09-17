import React, { useState } from 'react';
import { Download, FileText, Presentation, FileCode, Trash2, Loader2 } from 'lucide-react';
import { StudyDoc, ColorTheme } from '../types';
import confetti from 'canvas-confetti';
import { triggerDocumentDownload } from '../utils/downloadHelper';

interface DocumentCardProps {
  doc: StudyDoc;
  onDelete?: (id: string) => void;
  onDownloadSuccess?: (id: string) => void;
}

interface ThemeConfig {
  bgLight: string;
  blobColor: string;
  badgeBg: string;
  badgeText: string;
  buttonBg: string;
  buttonHover: string;
  textColor: string;
  iconBg: string;
}

const THEME_MAP: Record<ColorTheme, ThemeConfig> = {
  coral: {
    bgLight: 'bg-[#FFF5F2]/90 hover:bg-[#FFF5F2]',
    blobColor: 'bg-[#FF7E67]/15',
    badgeBg: 'bg-[#FF6B4A]',
    badgeText: 'text-white',
    buttonBg: 'bg-[#FF6B4A]',
    buttonHover: 'hover:bg-[#E85635]',
    textColor: 'text-slate-900',
    iconBg: 'from-[#FF8A65] to-[#FF5252]',
  },
  purple: {
    bgLight: 'bg-[#FAF5FF]/90 hover:bg-[#FAF5FF]',
    blobColor: 'bg-[#9333EA]/15',
    badgeBg: 'bg-[#9333EA]',
    badgeText: 'text-white',
    buttonBg: 'bg-[#9333EA]',
    buttonHover: 'hover:bg-[#7E22CE]',
    textColor: 'text-slate-900',
    iconBg: 'from-[#A855F7] to-[#7E22CE]',
  },
  blue: {
    bgLight: 'bg-[#F0F9FF]/90 hover:bg-[#F0F9FF]',
    blobColor: 'bg-[#0284C7]/15',
    badgeBg: 'bg-[#0284C7]',
    badgeText: 'text-white',
    buttonBg: 'bg-[#0284C7]',
    buttonHover: 'hover:bg-[#0369A1]',
    textColor: 'text-slate-900',
    iconBg: 'from-[#38BDF8] to-[#0284C7]',
  },
  mint: {
    bgLight: 'bg-[#F0FDF4]/90 hover:bg-[#F0FDF4]',
    blobColor: 'bg-[#10B981]/15',
    badgeBg: 'bg-[#10B981]',
    badgeText: 'text-white',
    buttonBg: 'bg-[#10B981]',
    buttonHover: 'hover:bg-[#059669]',
    textColor: 'text-slate-900',
    iconBg: 'from-[#34D399] to-[#059669]',
  },
  yellow: {
    bgLight: 'bg-[#FEFCE8]/90 hover:bg-[#FEFCE8]',
    blobColor: 'bg-[#CA8A04]/15',
    badgeBg: 'bg-[#EAB308]',
    badgeText: 'text-slate-900 font-bold',
    buttonBg: 'bg-[#EAB308]',
    buttonHover: 'hover:bg-[#CA8A04]',
    textColor: 'text-slate-900',
    iconBg: 'from-[#FACC15] to-[#CA8A04]',
  },
  rose: {
    bgLight: 'bg-[#FFF1F2]/90 hover:bg-[#FFF1F2]',
    blobColor: 'bg-[#F43F5E]/15',
    badgeBg: 'bg-[#F43F5E]',
    badgeText: 'text-white',
    buttonBg: 'bg-[#F43F5E]',
    buttonHover: 'hover:bg-[#E11D48]',
    textColor: 'text-slate-900',
    iconBg: 'from-[#FB7185] to-[#F43F5E]',
  },
  teal: {
    bgLight: 'bg-[#F0FDFA]/90 hover:bg-[#F0FDFA]',
    blobColor: 'bg-[#14B8A6]/15',
    badgeBg: 'bg-[#0D9488]',
    badgeText: 'text-white',
    buttonBg: 'bg-[#0D9488]',
    buttonHover: 'hover:bg-[#0F766E]',
    textColor: 'text-slate-900',
    iconBg: 'from-[#2DD4BF] to-[#0D9488]',
  },
  indigo: {
    bgLight: 'bg-[#F5F3FF]/90 hover:bg-[#F5F3FF]',
    blobColor: 'bg-[#6366F1]/15',
    badgeBg: 'bg-[#4F46E5]',
    badgeText: 'text-white',
    buttonBg: 'bg-[#4F46E5]',
    buttonHover: 'hover:bg-[#4338CA]',
    textColor: 'text-slate-900',
    iconBg: 'from-[#818CF8] to-[#4F46E5]',
  },
};

export const DocumentCard: React.FC<DocumentCardProps> = ({
  doc,
  onDelete,
  onDownloadSuccess,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const theme = THEME_MAP[doc.colorTheme] || THEME_MAP.indigo;

  const handleDownload = async (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    if (isDownloading) return;

    setIsDownloading(true);

    try {
      // Trigger celebratory confetti burst
      confetti({
        particleCount: 35,
        spread: 55,
        origin: { y: 0.8 },
        colors: ['#4F46E5', '#FF6B4A', '#10B981', '#06B6D4', '#CA8A04'],
      });

      await triggerDocumentDownload(doc);
      if (onDownloadSuccess) {
        onDownloadSuccess(doc.id);
      }
    } catch (err) {
      console.error('Download error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const renderIcon = () => {
    switch (doc.format) {
      case 'PPT':
        return <Presentation className="w-5 h-5 text-white drop-shadow-sm" />;
      case 'PDF':
        return <FileText className="w-5 h-5 text-white drop-shadow-sm" />;
      case 'DOCX':
        return <FileCode className="w-5 h-5 text-white drop-shadow-sm" />;
      default:
        return <FileText className="w-5 h-5 text-white drop-shadow-sm" />;
    }
  };

  return (
    <div
      id={`document-card-${doc.id}`}
      onClick={() => handleDownload()}
      className={`group relative rounded-3xl p-5 sm:p-6 transition-all duration-300 border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-1 cursor-pointer flex flex-col justify-between overflow-hidden ${theme.bgLight}`}
      title={`Click to download ${doc.title}`}
    >
      {/* Background soft color blob */}
      <div
        className={`absolute -top-12 -right-12 w-32 h-32 rounded-full ${theme.blobColor} blur-2xl pointer-events-none transition-transform group-hover:scale-125`}
      />

      {/* Top row: 3D Badge + Delete button */}
      <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-11 h-11 rounded-2xl bg-gradient-to-tr ${theme.iconBg} flex items-center justify-center shadow-md shadow-slate-300/40 transform transition-transform group-hover:scale-105`}
          >
            {renderIcon()}
          </div>
          <span
            className={`px-2.5 py-1 rounded-xl text-xs font-bold tracking-wider uppercase shadow-xs ${theme.badgeBg} ${theme.badgeText}`}
          >
            {doc.format}
          </span>
        </div>

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(doc.id);
            }}
            title="Delete Document"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Center content: Title and File Details */}
      <div className="relative z-10 flex-1 my-2">
        <h3
          className={`text-lg sm:text-xl font-bold tracking-tight ${theme.textColor} line-clamp-2 leading-snug font-display`}
          title={doc.title}
        >
          {doc.title}
        </h3>

        {/* Metadata: [Type] • [Size] */}
        <div className="mt-2 flex items-center gap-2 text-xs font-medium text-slate-500">
          <span className="font-semibold text-slate-700">{doc.format}</span>
          <span>•</span>
          <span>{doc.sizeFormatted}</span>
        </div>
      </div>

      {/* Bottom CTA: Pill-shaped Download button */}
      <div className="relative z-10 mt-5 pt-2">
        <button
          id={`download-btn-${doc.id}`}
          disabled={isDownloading}
          onClick={(e) => {
            e.stopPropagation();
            handleDownload();
          }}
          className={`w-full py-2.5 px-4 rounded-full font-semibold text-sm text-white shadow-sm flex items-center justify-center gap-2 transition-all duration-200 active:scale-98 ${theme.buttonBg} ${theme.buttonHover} ${isDownloading ? 'opacity-75 cursor-wait' : ''}`}
        >
          {isDownloading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Preparing {doc.format}...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4 transition-transform group-hover:translate-y-0.5" />
              <span>Download {doc.format}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
