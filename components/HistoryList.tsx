'use client';

import { useState, useEffect } from 'react';
import { getHistory, searchHistory, deleteAnalysis, clearHistory } from '@/lib/storage';
import { Analysis } from '@/lib/types';

interface HistoryListProps {
  onSelectAnalysis: (analysis: Analysis) => void;
}

export default function HistoryList({ onSelectAnalysis }: HistoryListProps) {
  const [history, setHistory] = useState<Analysis[]>([]);
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const loadHistory = () => {
    const filtered = search ? searchHistory(search) : getHistory();
    setHistory(filtered);
  };

  useEffect(() => {
    loadHistory();
  }, [search]);

  const handleDelete = (id: string) => {
    if (confirm('¿Eliminar este análisis?')) {
      deleteAnalysis(id);
      loadHistory();
    }
  };

  const handleClearAll = () => {
    if (confirm('¿Eliminar TODO el historial?')) {
      clearHistory();
      loadHistory();
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Historial de Análisis</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en historial..."
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-96">
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No hay análisis en el historial
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((analysis) => (
                <div
                  key={analysis.id}
                  className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 cursor-pointer" onClick={() => onSelectAnalysis(analysis)}>
                      <h3 className="font-bold">{analysis.videoTitle}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{analysis.channel}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                        {new Date(analysis.analyzedAt).toLocaleDateString()} - {' '}
                        {analysis.results.books.length} libros, {analysis.results.papers.length} papers
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(analysis.id)}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClearAll}
              className="w-full py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Limpiar todo el historial
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
