import React from 'react';
import { FilterCategory, SortOption } from '../types';
import { SlidersHorizontal, ArrowUpDown } from 'lucide-react';

interface FilterBarProps {
  selectedFormat: FilterCategory;
  onSelectFormat: (format: FilterCategory) => void;
  formatCounts: Record<FilterCategory, number>;
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  totalResults: number;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedFormat,
  onSelectFormat,
  formatCounts,
  sortBy,
  onSortChange,
  totalResults,
}) => {
  const tabs: { id: FilterCategory; label: string }[] = [
    { id: 'ALL', label: 'All Files' },
    { id: 'PPT', label: 'Presentations (PPT)' },
    { id: 'PDF', label: 'Documents (PDF)' },
    { id: 'DOCX', label: 'Word (DOCX)' },
  ];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 pb-2 border-b border-slate-200/60">
      {/* Format Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 w-full sm:w-auto scrollbar-none">
        {tabs.map((tab) => {
          const isActive = selectedFormat === tab.id;
          const count = formatCounts[tab.id] || 0;
          return (
            <button
              key={tab.id}
              id={`filter-tab-${tab.id.toLowerCase()}`}
              onClick={() => onSelectFormat(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                isActive
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/70'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-500'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Sort selection & count */}
      <div className="flex items-center justify-between w-full sm:w-auto gap-3 text-xs text-slate-500">
        <span className="font-medium text-slate-600">
          Showing <strong className="text-slate-900">{totalResults}</strong> documents
        </span>

        <div className="flex items-center gap-1.5 bg-white border border-slate-200/70 rounded-xl px-2.5 py-1.5 shadow-2xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            id="sort-select"
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value as SortOption)}
            aria-label="Sort documents"
            className="bg-transparent text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
          >
            <option value="latest">Recently Added</option>
            <option value="popular">Most Downloaded</option>
            <option value="title">Title (A-Z)</option>
            <option value="size">File Size</option>
          </select>
        </div>
      </div>
    </div>
  );
};
